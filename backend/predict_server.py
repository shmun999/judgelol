"""
JUDGELOL Decoder-Only 승률 예측 서버
- 포트: 5001
- Node.js 백엔드에서 호출
"""

from flask import Flask, request, jsonify
import numpy as np
import torch
import torch.nn as nn
import joblib
import os
import math

app = Flask(__name__)

# ─── 설정 ───────────────────────────────────────────
WINDOW_SIZE = 5
DROP_MINUTES = 0
DEVICE = torch.device("cpu")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "best_decoder_only.pt")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "scaler_decoder.pkl")

FEATURE_ORDER = [
    "gold_diff", "xp_diff",
    "top_tower", "mid_tower", "bot_tower",
    "dragon", "horde", "riftherald", "baron",
    "blue_gold", "red_gold", "blue_xp", "red_xp"
]

# ─── 모델 정의 (Decoder-Only / Causal Mask) ─────────
class WinPredictorDecoderOnly(nn.Module):
    def __init__(self, input_size=13, d_model=64, nhead=4, num_layers=2, dim_feedforward=128, dropout=0.1, max_len=5):  # ✅ max_len=5
        super().__init__()
        self.d_model = d_model

        self.input_proj = nn.Linear(input_size, d_model)
        self.pos_encoder = nn.Parameter(torch.randn(1, max_len, d_model) * (1 / math.sqrt(d_model)))

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model, nhead=nhead, dim_feedforward=dim_feedforward, dropout=dropout, batch_first=True
        )
        self.transformer_blocks = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        self.fc = nn.Linear(d_model, 1)
        self.sigmoid = nn.Sigmoid()

        self.register_buffer('causal_mask', self._generate_causal_mask(max_len))

    def _generate_causal_mask(self, sz):
        mask = (torch.triu(torch.ones(sz, sz)) == 1).transpose(0, 1)
        mask = mask.float().masked_fill(mask == 0, float('-inf')).masked_fill(mask == 1, float(0.0))
        return mask

    def forward(self, x):
        x = self.input_proj(x)
        x = x + self.pos_encoder[:, :x.size(1), :]
        seq_len = x.size(1)
        x = self.transformer_blocks(x, mask=self.causal_mask[:seq_len, :seq_len])
        out = x[:, -1, :]
        return self.sigmoid(self.fc(out)).squeeze(1)

# ─── 모델 & 스케일러 로드 ────────────────────────────
print("📦 모델 및 스케일러 로딩 중...")
scaler = joblib.load(SCALER_PATH)
model = WinPredictorDecoderOnly(input_size=13, max_len=WINDOW_SIZE).to(DEVICE)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.eval()
print("✅ 모델 로딩 완료!")

# ─── 예측 엔드포인트 ─────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        frames = data.get("frames", [])

        if len(frames) < WINDOW_SIZE:
            return jsonify({"error": f"최소 {WINDOW_SIZE}분 이상의 데이터가 필요합니다."}), 400

        # 피처 배열 구성
        X_raw = []
        for f in frames:
            blue_gold = f.get("blue_gold", 0)
            red_gold  = f.get("red_gold", 0)
            blue_xp   = f.get("blue_xp", 0)
            red_xp    = f.get("red_xp", 0)
            row = [
                blue_gold - red_gold,
                blue_xp - red_xp,
                f.get("top_tower", 0),
                f.get("mid_tower", 0),
                f.get("bot_tower", 0),
                f.get("dragon", 0),
                f.get("horde", 0),
                f.get("riftherald", 0),
                f.get("baron", 0),
                blue_gold,
                red_gold,
                blue_xp,
                red_xp,
            ]
            X_raw.append(row)

        X_raw = np.array(X_raw, dtype=np.float32)

        # ✅ 수정: t를 WINDOW_SIZE부터 시작 → 항상 정확히 WINDOW_SIZE개 실제 데이터만 사용
        # 기존: range(1, len+1) + 음수 인덱스 버그 → 초반 t에서 빈 배열 → garbage 예측
        # 수정: range(WINDOW_SIZE, len+1) → t=WINDOW_SIZE일 때 X_raw[0:WINDOW_SIZE] 정상
        win_probs = []
        with torch.no_grad():
            for t in range(WINDOW_SIZE, len(X_raw) + 1):
                window_raw = X_raw[t - WINDOW_SIZE:t]   # 항상 정확히 WINDOW_SIZE개
                window_scaled = scaler.transform(window_raw)
                tensor = torch.tensor(window_scaled, dtype=torch.float32).unsqueeze(0).to(DEVICE)
                prob = model(tensor).item()
                minute = DROP_MINUTES + t - 1            # 첫 minute = WINDOW_SIZE - 1 = 4
                win_probs.append({
                    "minute": minute,
                    "prob": round(prob * 100, 1)
                })

        return jsonify({"win_probability": win_probs})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)

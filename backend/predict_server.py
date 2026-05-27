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
WINDOW_SIZE = 3          # ✅ 수정: 5 → 3 (실제 모델 pos_encoder shape=(1,3,64) 에 맞춤)
DROP_MINUTES = 0
DEVICE = torch.device("cpu")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "best_decoder_only.pt")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "scaler_decoder.pkl")

# ─── 모델 정의 (predict_decoder.py와 동일) ──────────
class WinPredictorDecoderOnly(nn.Module):
    def __init__(self, input_size=13, d_model=64, nhead=4, num_layers=2, dim_feedforward=128, dropout=0.1, max_len=3):  # ✅ max_len=3
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
model = WinPredictorDecoderOnly(input_size=13, max_len=WINDOW_SIZE).to(DEVICE)  # ✅ max_len=WINDOW_SIZE=3
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.eval()
print("✅ 모델 로딩 완료!")

# ─── 예측 엔드포인트 ─────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        frames = data.get("frames", [])

        if len(frames) < 1:
            return jsonify({"error": "frames 데이터가 필요합니다."}), 400

        # 피처 배열 구성 (predict_decoder.py의 features.append와 동일한 순서)
        X_raw = []
        for f in frames:
            blue_gold = f.get("blue_gold", 0)
            red_gold  = f.get("red_gold", 0)
            blue_xp   = f.get("blue_xp", 0)
            red_xp    = f.get("red_xp", 0)
            row = [
                blue_gold - red_gold,            # gold_diff
                blue_xp - red_xp,                # xp_diff
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

        # ✅ predict_decoder.py와 완전히 동일한 슬라이딩 윈도우 로직
        # t=1: X_raw[-2:1] → 긴 배열에서 음수 인덱스 → 빈 배열 → 전체 zero 패딩 → minute=0 예측
        # t=2: X_raw[-1:2] → 빈 배열 → 전체 zero 패딩 → minute=1 예측
        # t=3: X_raw[0:3]  → 실제 데이터 3개 → minute=2 예측
        # → 모델이 zero 패딩으로 학습됐기 때문에 minute=0부터 정상 예측 가능
        win_probs = []
        with torch.no_grad():
            for t in range(1, len(X_raw) + 1):
                window_raw = X_raw[t - WINDOW_SIZE:t]
                if len(window_raw) < WINDOW_SIZE:
                    pad = np.zeros((WINDOW_SIZE - len(window_raw), X_raw.shape[1]), dtype=np.float32)
                    window_raw = np.vstack([pad, window_raw])

                window_scaled = scaler.transform(window_raw)
                tensor = torch.tensor(window_scaled, dtype=torch.float32).unsqueeze(0).to(DEVICE)
                prob = model(tensor).item()
                minute = DROP_MINUTES + t - 1
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

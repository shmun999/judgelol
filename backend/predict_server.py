"""
JUDGELOL LSTM 승률 예측 서버
- 포트: 5001
- Node.js 백엔드에서 호출
"""

from flask import Flask, request, jsonify
import numpy as np
import torch
import torch.nn as nn
import joblib
import os

app = Flask(__name__)

# ─── 설정 ───────────────────────────────────────────
WINDOW_SIZE = 5
DROP_MINUTES = 2
DEVICE = torch.device("cpu")  # EC2 t2.micro는 CPU만 사용
MODEL_PATH = os.path.join(os.path.dirname(__file__), "best_lstm.pt")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "scaler.pkl")

# ─── 피처 순서 (13개) ───────────────────────────────
# [gold_diff, xp_diff, 이진값7개, blue_gold, red_gold, blue_xp, red_xp]
# 이진값 순서: top_tower, mid_tower, bot_tower, dragon, horde, riftherald, baron
FEATURE_ORDER = [
    "gold_diff", "xp_diff",
    "top_tower", "mid_tower", "bot_tower",
    "dragon", "horde", "riftherald", "baron",
    "blue_gold", "red_gold", "blue_xp", "red_xp"
]

# ─── 모델 정의 ───────────────────────────────────────
class WinPredictorLSTM(nn.Module):
    def __init__(self, input_size=13, hidden_size=64, num_layers=2, dropout=0.1):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers,
                            batch_first=True,
                            dropout=dropout if num_layers > 1 else 0.0)
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_size, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        out, _ = self.lstm(x)
        out = self.dropout(out[:, -1, :])
        return self.sigmoid(self.fc(out)).squeeze(1)

# ─── 모델 & 스케일러 로드 ────────────────────────────
print("📦 모델 및 스케일러 로딩 중...")
scaler = joblib.load(SCALER_PATH)
model = WinPredictorLSTM(input_size=13).to(DEVICE)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.eval()
print("✅ 모델 로딩 완료!")

# ─── 예측 엔드포인트 ─────────────────────────────────
@app.route("/predict", methods=["POST"])
def predict():
    """
    요청 형식:
    {
        "frames": [
            {
                "blue_gold": 500, "red_gold": 500,
                "blue_xp": 300, "red_xp": 300,
                "top_tower": 0, "mid_tower": 0, "bot_tower": 0,
                "dragon": 0, "horde": 0, "riftherald": 0, "baron": 0
            },
            ...
        ]
    }
    
    응답 형식:
    {
        "win_probability": [
            { "minute": 7, "prob": 52 },
            { "minute": 8, "prob": 55 },
            ...
        ]
    }
    """
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
                blue_gold - red_gold,   # gold_diff
                blue_xp - red_xp,       # xp_diff
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

        # 슬라이딩 윈도우 예측
        win_probs = []
        with torch.no_grad():
            for t in range(WINDOW_SIZE, len(X_raw) + 1):
                window = X_raw[t - WINDOW_SIZE:t]
                window_scaled = scaler.transform(window)
                tensor = torch.tensor(window_scaled, dtype=torch.float32).unsqueeze(0).to(DEVICE)
                prob = model(tensor).item()
                minute = DROP_MINUTES + t  # 실제 게임 분
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

import os
import gzip
import json
import numpy as np
import torch
import torch.nn as nn
import joblib
import matplotlib.pyplot as plt

# 설정
DROP_MINUTES = 2
WINDOW_SIZE = 5
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['axes.unicode_minus'] = False

# 1. 모델 구조 정의 (학습할 때와 100% 똑같아야 불러올 수 있습니다)
class WinPredictorLSTM(nn.Module):
    def __init__(self, input_size=6, hidden_size=64, num_layers=2, dropout=0.1):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=dropout)
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_size, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        out, _ = self.lstm(x)
        out = self.dropout(out[:, -1, :])
        return self.sigmoid(self.fc(out)).squeeze(1)

# 2. 단일 매치 데이터 파싱
def parse_single_match(match_id, data_dir="/home/j098227/LOLproject/match_data", timeline_dir="/home/j098227/LOLproject/match_timeline"):
    detail_path = os.path.join(data_dir, f"{match_id}.json.gz")
    timeline_path = os.path.join(timeline_dir, f"{match_id}.json.gz")
    
    with gzip.open(detail_path, 'rt', encoding='utf-8') as f: detail = json.load(f)
    with gzip.open(timeline_path, 'rt', encoding='utf-8') as f: timeline = json.load(f)
        
    teams = detail['info']['teams']
    blue_win = 1 if teams[0]['teamId'] == 100 and teams[0]['win'] else 0
    
    frames = timeline['info']['frames']
    features = []
    
    for minute, frame in enumerate(frames):
        if minute < DROP_MINUTES: continue
            
        p = frame['participantFrames']
        b_gold = sum(p[str(i)]['totalGold'] for i in range(1, 6))
        r_gold = sum(p[str(i)]['totalGold'] for i in range(6, 11))
        b_xp   = sum(p[str(i)]['xp'] for i in range(1, 6))
        r_xp   = sum(p[str(i)]['xp'] for i in range(6, 11))
        
        features.append([b_gold - r_gold, b_xp - r_xp, b_gold, r_gold, b_xp, r_xp])
        
    return np.array(features, dtype=np.float32), blue_win

# 3. 실전 예측 및 그래프 출력
def predict_and_plot(match_id):
    print(f"🔍 [{match_id}] 매치 예측을 시작합니다...")
    
    # 데이터 준비
    X_raw, actual_win = parse_single_match(match_id)
    
    # ⭐️ 스케일러 및 모델 로드
    scaler = joblib.load('scaler.pkl')
    X_scaled = scaler.transform(X_raw)
    
    model = WinPredictorLSTM().to(DEVICE)
    model.load_state_dict(torch.load('best_model.pt', map_location=DEVICE))
    model.eval()
    
    # 분 단위 예측 수행
    minutes = np.arange(DROP_MINUTES, len(X_scaled) + DROP_MINUTES)
    win_rates = []
    
    MAX_MINUTES = 45 # 훈련할 때 나왔던 값으로 맞춰주세요.

    with torch.no_grad():
        # 데이터가 최소 5분(WINDOW_SIZE)은 모여야 첫 판정이 가능합니다.
        # 실제 게임 시간으로는 DROP_MINUTES(2) + 5 = 7분부터 승률이 나옵니다.
        for t in range(WINDOW_SIZE, len(X_raw) + 1):
            
            # [순서 1] 가장 최근 5분(WINDOW_SIZE)만큼만 자르기
            start = t - WINDOW_SIZE
            window_raw = X_raw[start:t]
            
            # [순서 2] 정규화 (패딩은 이제 필요 없습니다!)
            window_scaled = scaler.transform(window_raw)
            
            # [순서 3] 모델 예측
            seq_tensor = torch.tensor(window_scaled, dtype=torch.float32).unsqueeze(0).to(DEVICE)
            win_rates.append(model(seq_tensor).item())

    # 그래프 x축 (시간) 세팅
    # 7분부터 점이 찍히기 시작합니다.
    minutes = np.arange(DROP_MINUTES + WINDOW_SIZE, len(X_raw) + DROP_MINUTES + 1)
    # 시각화
    plt.figure(figsize=(12, 5))
    plt.plot(minutes, win_rates, color="royalblue", linewidth=2, label="AI Blue team win rate prediction")
    plt.axhline(0.5, color="gray", linestyle="--", alpha=0.5)
    
    plt.fill_between(minutes, win_rates, 0.5, where=[w >= 0.5 for w in win_rates], alpha=0.15, color="blue")
    plt.fill_between(minutes, win_rates, 0.5, where=[w < 0.5 for w in win_rates], alpha=0.15, color="red")
    
    result_text = "Blue team win" if actual_win == 1 else "Red team win"
    plt.title(f"{match_id} Win rate prediction | result: {result_text}")
    plt.xlabel("match time (minutes)")
    plt.ylabel("Blue team win rate")
    plt.ylim(0, 1)
    plt.legend()
    plt.tight_layout()
    
    save_name = f"predict_result_{match_id}.png"
    plt.savefig(save_name, dpi=150)
    print(f"✅ 예측 완료! 그래프 저장됨: {save_name}")

if __name__ == "__main__":
    # 여기에 분석하고 싶은 매치 ID를 넣으세요!
    TARGET_MATCH = "KR_8039130098" 
    predict_and_plot(TARGET_MATCH)
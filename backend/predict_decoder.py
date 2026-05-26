import os
import gzip
import json
import numpy as np
import torch
import torch.nn as nn
import math
import joblib
import matplotlib.pyplot as plt

# ===== 설정 =====
DATA_DIR      = "/home/j098227/LOLproject/match_data"      
TIMELINE_DIR  = "/home/j098227/LOLproject/match_timeline"
DROP_MINUTES  = 0
WINDOW_SIZE   = 3
INPUT_SIZE    = 13
DEVICE        = torch.device("cuda" if torch.cuda.is_available() else "cpu")

plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['axes.unicode_minus'] = False

# ============================================================
# 1. 모델 구조 (Decoder-Only / Causal Mask 장착)
# ============================================================
class WinPredictorDecoderOnly(nn.Module):
    def __init__(self, input_size=13, d_model=64, nhead=4, num_layers=2, dim_feedforward=128, dropout=0.1, max_len=5):
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
        
        # 미래 정보를 차단하는 마스크
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

# ============================================================
# 2. 단일 매치 데이터 파싱 (13 피처 추출)
# ============================================================
def parse_single_match(match_id):
    detail_path = os.path.join(DATA_DIR, f"{match_id}.json.gz")
    timeline_path = os.path.join(TIMELINE_DIR, f"{match_id}.json.gz")
    
    with gzip.open(detail_path, 'rt', encoding='utf-8') as f: detail = json.load(f)
    with gzip.open(timeline_path, 'rt', encoding='utf-8') as f: timeline = json.load(f)
        
    teams = detail['info']['teams']
    blue_win = 1 if teams[0]['teamId'] == 100 and teams[0]['win'] else 0
    
    frames = timeline['info']['frames']
    features = []
    
    b_towers = {'TOP_LANE': 0, 'MID_LANE': 0, 'BOT_LANE': 0}
    r_towers = {'TOP_LANE': 0, 'MID_LANE': 0, 'BOT_LANE': 0}
    b_obj = {'DRAGON': 0, 'HORDE': 0, 'RIFTHERALD': 0, 'BARON_NASHOR': 0}
    r_obj = {'DRAGON': 0, 'HORDE': 0, 'RIFTHERALD': 0, 'BARON_NASHOR': 0}
    TARGET_EVENTS = {'BUILDING_KILL', 'ELITE_MONSTER_KILL'}
    
    for minute, frame in enumerate(frames):
        for event in frame.get('events', []):
            if event['type'] not in TARGET_EVENTS: continue
                
            if event['type'] == 'BUILDING_KILL' and event.get('buildingType') == 'TOWER_BUILDING':
                victim_team = event.get('teamId')
                lane = event.get('laneType')
                if lane in b_towers:
                    if victim_team == 100: r_towers[lane] += 1
                    elif victim_team == 200: b_towers[lane] += 1
                        
            elif event['type'] == 'ELITE_MONSTER_KILL':
                killer_team = event.get('killerTeamId')
                monster = event.get('monsterType')
                if monster in b_obj:
                    if killer_team == 100: b_obj[monster] += 1
                    elif killer_team == 200: r_obj[monster] += 1

        if minute < DROP_MINUTES: continue
            
        p = frame['participantFrames']
        b_gold = sum(p[str(i)]['totalGold'] for i in range(1, 6))
        r_gold = sum(p[str(i)]['totalGold'] for i in range(6, 11))
        b_xp   = sum(p[str(i)]['xp'] for i in range(1, 6))
        r_xp   = sum(p[str(i)]['xp'] for i in range(6, 11))
        
        features.append([
            b_gold - r_gold, b_xp - r_xp, 
            b_towers['TOP_LANE'] - r_towers['TOP_LANE'], b_towers['MID_LANE'] - r_towers['MID_LANE'], b_towers['BOT_LANE'] - r_towers['BOT_LANE'], 
            b_obj['DRAGON'] - r_obj['DRAGON'], b_obj['HORDE'] - r_obj['HORDE'], b_obj['RIFTHERALD'] - r_obj['RIFTHERALD'], b_obj['BARON_NASHOR'] - r_obj['BARON_NASHOR'], 
            b_gold, r_gold, b_xp, r_xp
        ])
        
    return np.array(features, dtype=np.float32), blue_win

# ============================================================
# 3. 실전 예측 및 시각화
# ============================================================
def predict_and_plot(match_id):
    print(f"🔍 [{match_id}] 디코더 전용(GPT 스타일) 모델 예측을 시작합니다...")
    
    X_raw, actual_win = parse_single_match(match_id)
    
    if len(X_raw) < WINDOW_SIZE:
        print("❌ 경기가 너무 짧아 예측할 수 없습니다.")
        return
    
    # ⭐️ 디코더 전용 스케일러와 모델 로드
    scaler = joblib.load('scaler_decoder.pkl')
    model = WinPredictorDecoderOnly(input_size=INPUT_SIZE, max_len=WINDOW_SIZE).to(DEVICE)
    model.load_state_dict(torch.load('best_decoder_only.pt', map_location=DEVICE))
    model.eval()
    
    win_rates = []
    
    with torch.no_grad():
        for t in range(1, len(X_raw) + 1):
            window_raw = X_raw[t - WINDOW_SIZE : t]
            if len(window_raw) < WINDOW_SIZE:
                pad = np.zeros((WINDOW_SIZE - len(window_raw), X_raw.shape[1]), dtype=np.float32)
                window_raw = np.vstack([pad, window_raw])            

            window_scaled = scaler.transform(window_raw)
            seq_tensor = torch.tensor(window_scaled, dtype=torch.float32).unsqueeze(0).to(DEVICE)
            win_rates.append(model(seq_tensor).item())

        minutes = np.arange(0, len(X_raw))
    
    plt.figure(figsize=(12, 5))
    plt.plot(minutes, win_rates, color="teal", linewidth=2, label="Decoder-Only Win Rate (Blue)")
    plt.axhline(0.5, color="gray", linestyle="--", alpha=0.5)
    
    plt.fill_between(minutes, win_rates, 0.5, where=[w >= 0.5 for w in win_rates], alpha=0.15, color="blue")
    plt.fill_between(minutes, win_rates, 0.5, where=[w < 0.5 for w in win_rates], alpha=0.15, color="red")
    
    result_text = "Blue Team Win" if actual_win == 1 else "Red Team Win"
    plt.title(f"{match_id} (Decoder-Only) | Actual Result: {result_text}")
    plt.xlabel("Match Time (minutes)")
    plt.ylabel("Blue Team Win Rate")
    plt.ylim(0, 1)
    plt.legend()
    plt.tight_layout()
    
    save_name = f"predict_decoder_{match_id}.png"
    plt.savefig(save_name, dpi=150)
    print(f"✅ 분석 완료! 그래프 저장됨: {save_name}")

if __name__ == "__main__":
    import random
    files = [f.replace('.json.gz', '') for f in os.listdir(TIMELINE_DIR) if f.endswith('.json.gz')]
    
    if files:
        TARGET_MATCH = "KR_8045810572" 
        predict_and_plot(TARGET_MATCH)
    else:
        print(f"❌ {TIMELINE_DIR} 폴더에 데이터가 없습니다.")
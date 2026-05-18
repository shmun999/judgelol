"""
LoL 승률 예측 LSTM 모델 (JSON.GZ 직접 로드 버전)
- 입력: match_data 및 match_timeline 폴더의 .json.gz 파일들
- 출력: 분 단위 블루팀 승률 예측 (0.0 ~ 1.0)
- 주요 변경점: 현재 slicing window
"""

import os
import gzip
import json
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, accuracy_score
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import joblib # 맨 위에 추가

# ===== 설정 =====
DATA_DIR      = "/home/j098227/LOLproject/match_data"       # 상세 데이터 폴더
TIMELINE_DIR  = "/home/j098227/LOLproject/match_timeline"   # 타임라인 데이터 폴더
DROP_MINUTES  = 2                  # 초반 노이즈 제거
BATCH_SIZE    = 32
EPOCHS        = 50
LEARNING_RATE = 1e-3
HIDDEN_SIZE   = 64
NUM_LAYERS    = 2
DROPOUT       = 0.1
DEVICE        = torch.device("cuda" if torch.cuda.is_available() else "cpu")
WINDOW_SIZE = 5

plt.rcParams['font.family'] = ['NanumGothic', 'Noto Sans CJK KR', 'Malgun Gothic', 'AppleGothic', 'sans-serif']   
plt.rcParams['axes.unicode_minus'] = False   

print(f"🖥  학습 디바이스: {DEVICE}")


# ============================================================
# 1. 원본 JSON.GZ 직접 로드 및 피처 추출 (메모리상 처리)
# ============================================================
def load_and_extract_features(data_dir, timeline_dir, drop_minutes):
    print("⏳ 원본 JSON 압축 파일에서 피처를 추출하고 있습니다... (시간이 조금 걸릴 수 있습니다)")
    X_raw, y_raw, match_ids = [], [], []
    
    files = [f.replace('.json.gz', '') for f in os.listdir(timeline_dir) if f.endswith('.json.gz')]
    
    for i, match_id in enumerate(files, 1):
        detail_path = os.path.join(data_dir, f"{match_id}.json.gz")
        timeline_path = os.path.join(timeline_dir, f"{match_id}.json.gz")
        
        if not os.path.exists(detail_path): 
            continue

        try:
            with gzip.open(detail_path, 'rt', encoding='utf-8') as f: detail = json.load(f)
            with gzip.open(timeline_path, 'rt', encoding='utf-8') as f: timeline = json.load(f)
        except Exception:
            continue

        # 1-1. 정답지(Label): 블루팀 승리 여부
        teams = detail['info']['teams']
        blue_win = 1 if teams[0]['teamId'] == 100 and teams[0]['win'] else 0
        
        # 1-2. 타임라인 분(Minute)별 피처 계산
        frames = timeline['info']['frames']
        match_features = []
        
        for minute, frame in enumerate(frames):
            if minute < drop_minutes: 
                continue # 지정된 초반 시간은 제외
                
            p_frames = frame['participantFrames']
            
            # 블루/레드 골드 및 경험치 합산
            blue_gold = sum(p_frames[str(pid)]['totalGold'] for pid in range(1, 6))
            red_gold  = sum(p_frames[str(pid)]['totalGold'] for pid in range(6, 11))
            blue_xp   = sum(p_frames[str(pid)]['xp'] for pid in range(1, 6))
            red_xp    = sum(p_frames[str(pid)]['xp'] for pid in range(6, 11))
            
            # 격차 계산 (중요 피처)
            gold_diff = blue_gold - red_gold
            xp_diff   = blue_xp - red_xp
            
            # [골드격차, 경험치격차, 블루팀골드, 레드팀골드, 블루팀경험치, 레드팀경험치] (총 6개 변수)
            match_features.append([gold_diff, xp_diff, blue_gold, red_gold, blue_xp, red_xp])

        if len(match_features) > 0:
            X_raw.append(np.array(match_features, dtype=np.float32))
            y_raw.append(blue_win)
            match_ids.append(match_id)
            
        if i % 1000 == 0:
            print(f"  [{i}/{len(files)}]경기 처리 완료...")

    print(f"✅ JSON 로드 및 변환 완료: 총 {len(match_ids)}경기")
    return X_raw, np.array(y_raw, dtype=np.float32), match_ids

# ============================================================
# 2. 전처리 및 슬라이딩 윈도우 분할 (패딩 완전 제거!)
# ============================================================
def preprocess_sliding_window(X_raw, y_raw, match_ids):
    print(f"\n⏱  적용 기법: {WINDOW_SIZE}분 슬라이딩 윈도우 (패딩 제거)")

    indices = np.arange(len(y_raw))
    train_idx, test_idx = train_test_split(indices, test_size=0.2, random_state=42)
    val_idx, test_idx = train_test_split(test_idx, test_size=0.5, random_state=42)

    # 1. 스케일러 학습 (훈련 데이터 전체를 평탄화시켜서 기준점 잡기)
    scaler = StandardScaler()
    flat_train_X = np.vstack([X_raw[i] for i in train_idx])
    scaler.fit(flat_train_X)
    
    # 모델 추론을 위해 스케일러 파일 저장 (필수!)
    import joblib
    joblib.dump(scaler, 'scaler.pkl')

    # 2. 슬라이딩 윈도우 생성 함수
    def make_windows(indices):
        X_windows, y_windows, ids_windows = [], [], []

        for i in indices:
            seq_raw = X_raw[i]
            T = len(seq_raw)

            # 경기 시간이 윈도우(5분)보다 짧으면 스킵 (롤에서는 거의 없음)
            if T < WINDOW_SIZE:
                continue
                
            # ⭐️ 핵심: 1분씩 이동하며 5분치 데이터를 캡처
            # 예: [0:5], [1:6], [2:7] ...
            for start in range(T - WINDOW_SIZE + 1):
                end = start + WINDOW_SIZE
                window_raw = seq_raw[start:end]

                # 5분짜리 윈도우를 깔끔하게 정규화
                window_scaled = scaler.transform(window_raw)

                X_windows.append(window_scaled)
                y_windows.append(y_raw[i])
                ids_windows.append(match_ids[i])

        return np.array(X_windows, dtype=np.float32), np.array(y_windows, dtype=np.float32), ids_windows

    X_train, y_train, _ = make_windows(train_idx)
    X_val, y_val, _     = make_windows(val_idx)
    X_test, y_test, test_match_ids = make_windows(test_idx)

    # 평가용 원본 데이터 보존
    X_test_raw = [X_raw[i] for i in test_idx]

    # 반환값에서 MAX_MINUTES 제거됨
    return X_train, y_train, X_val, y_val, X_test, y_test, scaler, test_match_ids, X_test_raw
# ============================================================
# 3 ~ 7단계: 데이터 로더, 모델 정의, 학습 루프 (기존과 100% 동일)
# ============================================================
class MatchDataset(Dataset):
    def __init__(self, X, y):
        self.X = torch.tensor(X)
        self.y = torch.tensor(y)

    def __len__(self):
        return len(self.y)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]

class WinPredictorLSTM(nn.Module):
    def __init__(self, input_size, hidden_size, num_layers, dropout):
        super().__init__()
        self.lstm = nn.LSTM(input_size=input_size, hidden_size=hidden_size, num_layers=num_layers, batch_first=True, dropout=dropout if num_layers > 1 else 0.0)
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_size, 1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        out, _ = self.lstm(x)
        out = out[:, -1, :]
        out = self.dropout(out)
        out = self.fc(out)
        out = self.sigmoid(out)
        return out.squeeze(1)

def train_epoch(model, loader, criterion, optimizer):
    model.train()
    total_loss = 0
    for X_batch, y_batch in loader:
        X_batch, y_batch = X_batch.to(DEVICE), y_batch.to(DEVICE)
        optimizer.zero_grad()
        pred = model(X_batch)
        loss = criterion(pred, y_batch)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()
    return total_loss / len(loader)

def eval_epoch(model, loader, criterion):
    model.eval()
    total_loss = 0
    all_preds, all_labels = [], []
    with torch.no_grad():
        for X_batch, y_batch in loader:
            X_batch, y_batch = X_batch.to(DEVICE), y_batch.to(DEVICE)
            pred = model(X_batch)
            loss = criterion(pred, y_batch)
            total_loss += loss.item()
            all_preds.extend(pred.cpu().numpy())
            all_labels.extend(y_batch.cpu().numpy())

    avg_loss = total_loss / len(loader)
    auc = roc_auc_score(all_labels, all_preds)
    acc = accuracy_score(all_labels, [1 if p >= 0.5 else 0 for p in all_preds])
    return avg_loss, auc, acc

def plot_history(train_losses, val_losses, val_aucs, val_accs):
    fig, axes = plt.subplots(1, 3, figsize=(15, 4))
    axes[0].plot(train_losses, label="Train Loss")
    axes[0].plot(val_losses, label="Val Loss")
    axes[0].set_title("Loss")
    axes[0].set_xlabel("Epoch")
    axes[0].legend()
    axes[1].plot(val_aucs, color="orange", label="Val AUC")
    axes[1].set_title("AUC-ROC")
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylim(0.5, 1.0)
    axes[1].legend()
    axes[2].plot(val_accs, color="green", label="Val Accuracy")
    axes[2].set_title("Accuracy")
    axes[2].set_xlabel("Epoch")
    axes[2].set_ylim(0.5, 1.0)
    axes[2].legend()
    plt.tight_layout()
    plt.savefig("training_history.png", dpi=150)
    print("📊 학습 그래프 저장: training_history.png")

# ============================================================
# 8. 그래프 출력 (데이터 프레임 제거 버전으로 수정)
# ============================================================
def predict_winrate_by_minute(model, x_single_raw, match_id, label, scaler):
    features = scaler.transform(x_single_raw) 
    minutes = np.arange(DROP_MINUTES, len(features) + DROP_MINUTES)

    model.eval()
    win_rates = []
    with torch.no_grad():
        for t in range(1, len(features) + 1):
            seq = torch.tensor(features[:t], dtype=torch.float32).unsqueeze(0).to(DEVICE)
            pred = model(seq).item()
            win_rates.append(pred)

    plt.figure(figsize=(12, 5))
    plt.plot(minutes, win_rates, color="royalblue", linewidth=2, label="Blue Team Win Rate")
    plt.axhline(0.5, color="gray", linestyle="--", alpha=0.5, label="50%")
    plt.fill_between(minutes, win_rates, 0.5, where=[w >= 0.5 for w in win_rates], alpha=0.15, color="blue")
    plt.fill_between(minutes, win_rates, 0.5, where=[w < 0.5 for w in win_rates], alpha=0.15, color="red")
    
    result = "Blue team win" if label == 1 else "Red team win"
    plt.title(f"{match_id} | Actual Result: {result}")
    plt.xlabel("Match Time (Minutes)")
    plt.ylabel("Blue Team Win Rate")
    plt.ylim(0, 1)
    plt.legend()
    plt.tight_layout()
    plt.savefig(f"winrate_{match_id}.png", dpi=150)
    print(f"📊 승률 그래프 저장: winrate_{match_id}.png")


# ============================================================
# 메인 실행
# ============================================================
if __name__ == "__main__":
    # ── 1. 데이터 로드 및 피처 추출 ──
    X_raw, y_raw, match_ids = load_and_extract_features(DATA_DIR, TIMELINE_DIR, DROP_MINUTES)
    INPUT_SIZE = X_raw[0].shape[1] # [골드격차, 경험치격차 등...] (총 6개)
    print(f"\n🔢 입력 피처 수: {INPUT_SIZE}개")

    # ── 2. 전처리 및 시퀀스 변환 ──
    X_train, y_train, X_val, y_val, X_test, y_test, scaler, test_match_ids, X_test_raw = preprocess_sliding_window(X_raw, y_raw, match_ids)

    print(f"  X_train: {X_train.shape}  y_train: {y_train.shape}")
    print(f"  X_val:   {X_val.shape}    y_val:   {y_val.shape}")
    print(f"  X_test:  {X_test.shape}   y_test:  {y_test.shape}")

    # ── 3. DataLoader ──
    train_loader = DataLoader(MatchDataset(X_train, y_train), batch_size=BATCH_SIZE, shuffle=True)
    val_loader   = DataLoader(MatchDataset(X_val,   y_val),   batch_size=BATCH_SIZE)
    test_loader  = DataLoader(MatchDataset(X_test,  y_test),  batch_size=BATCH_SIZE)

    # ── 4. 모델 초기화 및 학습 ──
    model = WinPredictorLSTM(INPUT_SIZE, HIDDEN_SIZE, NUM_LAYERS, DROPOUT).to(DEVICE)
    criterion = nn.BCELoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=5, factor=0.5)

    print(f"\n🚀 학습 시작 (총 {EPOCHS} 에폭)")
    train_losses, val_losses, val_aucs, val_accs = [], [], [], []
    best_auc, best_epoch = 0, 0

    for epoch in range(1, EPOCHS + 1):
        train_loss = train_epoch(model, train_loader, criterion, optimizer)
        val_loss, val_auc, val_acc = eval_epoch(model, val_loader, criterion)
        scheduler.step(val_loss)

        train_losses.append(train_loss)
        val_losses.append(val_loss)
        val_aucs.append(val_auc)
        val_accs.append(val_acc)

        if val_auc > best_auc:
            best_auc, best_epoch = val_auc, epoch
            torch.save(model.state_dict(), "best_model.pt")

        if epoch % 5 == 0 or epoch == 1:
            print(f"  Epoch {epoch:3d} | Train Loss: {train_loss:.4f} | Val Loss: {val_loss:.4f} | Val AUC: {val_auc:.4f} | Val Acc: {val_acc:.4f}")

    print(f"\n🏆 최고 Val AUC: {best_auc:.4f} (Epoch {best_epoch})")

    # ── 5. 평가 및 그래프 출력 ──
    model.load_state_dict(torch.load("best_model.pt"))
    test_loss, test_auc, test_acc = eval_epoch(model, test_loader, criterion)
    print(f"\n📋 테스트 결과: AUC-ROC: {test_auc:.4f} / Accuracy: {test_acc:.4f}")
    plot_history(train_losses, val_losses, val_aucs, val_accs)

    # 테스트셋 첫 번째 경기 승률 예측 시각화
    sample_x_raw = X_test_raw[0]
    sample_id = test_match_ids[0]
    sample_label = y_test[0]
    predict_winrate_by_minute(model, sample_x_raw, sample_id, sample_label, scaler)
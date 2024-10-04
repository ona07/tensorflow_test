const videoElement = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const toggleButton = document.getElementById('toggleMode');

let net;
let mode = 'centerLine'; // デフォルトでは中央線モード

// ボタンのクリックでモードを切り替える
toggleButton.addEventListener('click', () => {
  mode = mode === 'centerLine' ? 'backAngle' : 'centerLine';
});

// 骨格を定義（関節をつなぐペア）
const skeletonConnections = [
  ['nose', 'leftEye'], ['nose', 'rightEye'], ['leftEye', 'leftEar'], ['rightEye', 'rightEar'],
  ['leftShoulder', 'rightShoulder'], ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightWrist'], ['rightShoulder', 'rightHip'], ['leftShoulder', 'leftHip'],
  ['leftHip', 'rightHip'], ['leftHip', 'leftKnee'], ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'], ['rightKnee', 'rightAnkle']
];

// ウェブカメラの設定
async function setupCamera() {
  videoElement.width = 640;
  videoElement.height = 480;

  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
  });
  videoElement.srcObject = stream;

  return new Promise((resolve) => {
    videoElement.onloadedmetadata = () => {
      resolve(videoElement);
    };
  });
}

// 角度計算関数
function calculateAngle(point1, point2, point3) {
  const vector1 = [point1.x - point2.x, point1.y - point2.y];
  const vector2 = [point3.x - point2.x, point3.y - point2.y];
  const dotProduct = vector1[0] * vector2[0] + vector1[1] * vector2[1];
  const magnitude1 = Math.sqrt(vector1[0] ** 2 + vector1[1] ** 2);
  const magnitude2 = Math.sqrt(vector2[0] ** 2 + vector2[1] ** 2);
  const angle = Math.acos(dotProduct / (magnitude1 * magnitude2));
  return (angle * 180) / Math.PI;
}

// 関節間を線で結ぶ関数
function drawSkeleton(keypoints) {
    skeletonConnections.forEach(([partA, partB]) => {
      const pointA = keypoints.find(p => p.part === partA);
      const pointB = keypoints.find(p => p.part === partB);
  
      // 関節ポイントの信頼度が十分高い場合に線を引く
      if (pointA && pointB && pointA.score > 0.5 && pointB.score > 0.5) {
        ctx.beginPath();
        ctx.moveTo(pointA.position.x, pointA.position.y);
        ctx.lineTo(pointB.position.x, pointB.position.y);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'green';
        ctx.stroke();
      }
    });
  }

// 肩の中央線とその垂直線を描画する関数
function drawShoulderLine(leftShoulder, rightShoulder) {
    if (leftShoulder && rightShoulder && leftShoulder.score > 0.5 && rightShoulder.score > 0.5) {
      // 両肩を結ぶ線を描画
      ctx.beginPath();
      ctx.moveTo(leftShoulder.position.x, leftShoulder.position.y);
      ctx.lineTo(rightShoulder.position.x, rightShoulder.position.y);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'blue'; // 青い線
      ctx.stroke();
  
      // 中央点の計算
      const midX = (leftShoulder.position.x + rightShoulder.position.x) / 2;
      const midY = (leftShoulder.position.y + rightShoulder.position.y) / 2;
  
      // 肩を結ぶ線のベクトルを計算
      const dx = rightShoulder.position.x - leftShoulder.position.x;
      const dy = rightShoulder.position.y - leftShoulder.position.y;
  
      // 垂直ベクトルの計算（90度回転）
      const perpendicularDx = -dy;
      const perpendicularDy = dx;
  
      // 垂直線の長さを調整
      const upperLength = 50;  // 上方向の長さは50px
      const lowerLength = 200; // 下方向の長さは200px
      const endX1 = midX + (perpendicularDx / Math.sqrt(dx ** 2 + dy ** 2)) * upperLength;
      const endY1 = midY + (perpendicularDy / Math.sqrt(dx ** 2 + dy ** 2)) * upperLength;
      const endX2 = midX - (perpendicularDx / Math.sqrt(dx ** 2 + dy ** 2)) * lowerLength;
      const endY2 = midY - (perpendicularDy / Math.sqrt(dx ** 2 + dy ** 2)) * lowerLength;
  
      // 垂直線を描画
      ctx.beginPath();
      ctx.moveTo(endX1, endY1); // 上方向に50px
      ctx.lineTo(endX2, endY2); // 下方向に200px
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'red'; // 垂直線の色は赤
      ctx.stroke();
    }
  }
  
  
  

// detectBackArch 関数を複数人対応にするため、poses を渡す
function detectBackArch(poses) {
    poses.forEach(({ keypoints }) => {
      const leftShoulder = keypoints.find((p) => p.part === 'leftShoulder');
      const rightShoulder = keypoints.find((p) => p.part === 'rightShoulder');
      const leftHip = keypoints.find((p) => p.part === 'leftHip');
      const rightHip = keypoints.find((p) => p.part === 'rightHip');
      const leftKnee = keypoints.find((p) => p.part === 'leftKnee');
      const rightKnee = keypoints.find((p) => p.part === 'rightKnee');
  
      if (
        leftShoulder && rightShoulder && leftHip && rightHip && leftKnee && rightKnee &&
        leftShoulder.score > 0.5 &&
        rightShoulder.score > 0.5 &&
        leftHip.score > 0.5 &&
        rightHip.score > 0.5 &&
        leftKnee.score > 0.5 &&
        rightKnee.score > 0.5
      ) {
        const angle = calculateAngle(leftShoulder.position, leftHip.position, leftKnee.position);
  
        // 角度がしきい値（170度）未満の場合にテキストを赤くし、それ以上の場合は黄色にする
        if (angle < 160) {
          ctx.fillStyle = 'red'; // しきい値未満なら赤色
        } else {
          ctx.fillStyle = 'yellow'; // しきい値以上なら黄色
        }
  
        // キャンバスに腰の角度を描画
        ctx.font = '24px Arial';
        ctx.fillText(`Back Angle: ${Math.round(angle)}°`, 10, 80);
      }
    });
  }

// 関節間を線で結ぶ関数
function drawSkeleton(keypoints) {
  skeletonConnections.forEach(([partA, partB]) => {
    const pointA = keypoints.find(p => p.part === partA);
    const pointB = keypoints.find(p => p.part === partB);

    // 関節ポイントの信頼度が十分高い場合に線を引く
    if (pointA && pointB && pointA.score > 0.5 && pointB.score > 0.5) {
      ctx.beginPath();
      ctx.moveTo(pointA.position.x, pointA.position.y);
      ctx.lineTo(pointB.position.x, pointB.position.y);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'green';
      ctx.stroke();
    }
  });
}

// 姿勢の推定（複数人）
async function estimatePose() {
    const poses = await net.estimatePoses(videoElement, {
      flipHorizontal: false,
      decodingMethod: 'multi-person', // 複数人用に変更
      maxDetections: 5 // 検出する人数の最大値（必要に応じて調整）
    });
  
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  
    // 複数人のポーズを処理
    poses.forEach((pose) => {
      const keypoints = pose.keypoints;
  
      // キーポイントを描画
      keypoints.forEach(({ position, score }) => {
        if (score > 0.5) {
          ctx.beginPath();
          ctx.arc(position.x, position.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = 'red';
          ctx.fill();
        }
      });
  
      // モードに応じて中央線または腰の角度を描画
      if (mode === 'centerLine') {
        const leftShoulder = keypoints.find((p) => p.part === 'leftShoulder');
        const rightShoulder = keypoints.find((p) => p.part === 'rightShoulder');
        drawShoulderLine(leftShoulder, rightShoulder);
      } else {
        detectBackArch([pose]); // detectBackArch 関数も pose を複数人に対応するように変更する必要があります
      }
  
      // 骨格全体を描画
      drawSkeleton(keypoints);
    });
  
    requestAnimationFrame(estimatePose);
  }    

// モデルの読み込み
async function loadPosenet() {
  net = await posenet.load();
  await setupCamera();
  videoElement.play();
  estimatePose();
}

loadPosenet();
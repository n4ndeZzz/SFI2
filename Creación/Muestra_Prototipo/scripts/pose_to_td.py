"""
pose_to_td.py

Captura la cámara, corre MediaPipe Pose Landmarker, y manda cada landmark
(x, y, visibilidad) por OSC a TouchDesigner.

Instalar dependencias una sola vez:
    pip install mediapipe opencv-python python-osc

Correr:
    python pose_to_td.py

Presiona "q" con la ventana de la cámara activa para salir.
"""

import os
import time
import urllib.request

import cv2
import mediapipe as mp
from pythonosc.udp_client import SimpleUDPClient

# --- configuración ---
TD_IP = "127.0.0.1"
TD_PORT = 8500          # coincide con el puerto de oscin_pose en TD
MODEL_PATH = "pose_landmarker_lite.task"
MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
    "pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
)
MIRROR = True  # voltea horizontalmente, para que se sienta como espejo

# --- descarga el modelo la primera vez que se corre ---
if not os.path.exists(MODEL_PATH):
    print("Descargando modelo de pose (una sola vez)...")
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    print("Listo.")

BaseOptions = mp.tasks.BaseOptions
PoseLandmarker = mp.tasks.vision.PoseLandmarker
PoseLandmarkerOptions = mp.tasks.vision.PoseLandmarkerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

options = PoseLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=MODEL_PATH),
    running_mode=VisionRunningMode.VIDEO,
    num_poses=1,
)

osc = SimpleUDPClient(TD_IP, TD_PORT)
cap = cv2.VideoCapture(0)

print(f"Mandando landmarks a {TD_IP}:{TD_PORT} — presiona 'q' para salir.")

with PoseLandmarker.create_from_options(options) as landmarker:
    start_time = time.time()
    while cap.isOpened():
        ok, frame = cap.read()
        if not ok:
            print("No se pudo leer la cámara.")
            break

        if MIRROR:
            frame = cv2.flip(frame, 1)

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        timestamp_ms = int((time.time() - start_time) * 1000)

        result = landmarker.detect_for_video(mp_image, timestamp_ms)

        if result.pose_landmarks:
            landmarks = result.pose_landmarks[0]  # una sola persona
            for i, lm in enumerate(landmarks):
                osc.send_message(f"/pose/{i}", [lm.x, lm.y, lm.visibility])

        cv2.imshow("Pose - presiona q para salir", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

cap.release()
cv2.destroyAllWindows()

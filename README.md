# P2PChat

### Giới thiệu

### Cài đặt

1.  Yêu cầu

    - Đã cài python 3

2.  Hướng dẫn cài đặt

    - Download hoặc clone repo này về máy.
    - Vào thư mục Chatapp_flask và cài các thư viện cần thiết bằng lệnh `pip install -r requirements.txt`
    - Vào thư mục app
    - Trong thư mục /static/js/script.js đổi: `addr="10.23.65.1";` thành `addr="<địa chỉ ip của server>";`
      _lưu ý: có thể đổi port của server websocket trong file `websocketSV.py` và server flask trong file `main.py` nếu cần _

    - Mở terminal/powershell chạy lệnh `python main.py`

    - Giờ có thể mở browser lên nhập địa chỉ server và port vào thanh URL và sử dụng trong mạng LAN

### Sử dụng

### References

[1][webrtc documents](https://webrtc.org/start "WebRTC Documents")
[2][webrtc infrastructure](https://www.html5rocks.com/en/tutorials/webrtc/infrastructure "WebRTC infrastructure")
[3][websocet - python documents](https://websockets.readthedocs.io/en/stable/intro.html "WebSocet - Python Documents")
[4][webrtc tutoral](https://websitebeaver.com/insanely-simple-webrtc-video-chat-using-firebase-with-codepen-demo "WebRTC tutoral")
[5][tim hiểu nat stun turn](https://kipalog.com/posts/WebRTC-basic---Phan-1--Tim-hieu-ve-NAT--STUN--TURN-vs-ICE "Tim hiểu NAT STUN TURN")

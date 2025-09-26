from flask import Flask, render_template

app = Flask(__name__)

devices = [
    {"id": 1, "name": "Light bulbs", "brand": "Philips Hue", "state": True, "icon": "💡"},
    {"id": 2, "name": "Smart TV", "brand": "Panasonic", "state": False, "icon": "📺"},
    {"id": 3, "name": "Wi-Fi Router", "brand": "TP Link", "state": True, "icon": "📶"},
    {"id": 4, "name": "CCTV", "brand": "Security Camera 360°", "state": False, "icon": "📹"}
]

@app.route('/')
def device_control():
    return render_template('devicescontrol.html', devices=devices)

if __name__ == '__main__':
    app.run(debug=True)
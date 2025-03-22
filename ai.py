from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route("/analyze", methods=["POST"])
def analyze_spending():
    data = request.get_json()
    total_spent = data.get("totalSpent", 0)
    
    # Simple rule-based AI
    if total_spent > 50:
        suggestion = "You've spent a lot of WPU recently—consider saving some!"
    elif total_spent > 20:
        suggestion = "Your spending is increasing—keep an eye on your budget!"
    else:
        suggestion = "Your spending looks good—keep it up!"
    
    return jsonify({"suggestion": suggestion})

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))  # Use PORT from env, default to 5000
    app.run(host="0.0.0.0", port=port)
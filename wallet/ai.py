import json
from collections import defaultdict
from flask import Flask, request, jsonify

app = Flask(__name__)

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
    app.run(host="0.0.0.0", port=5000)



tx_log = defaultdict(int)

def log_transaction(sender, amount):
    tx_log[sender] += amount
    if tx_log[sender] > 10 * 10**18:  # >10 WPU spent
        print(f"Alert: You've spent {tx_log[sender] / 10**18} WPU—slow down!")

# Simulate txs for now—later connect to blockchain
log_transaction("0xYourAddress", 5 * 10**18)
log_transaction("0xYourAddress", 6 * 10**18)
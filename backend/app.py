from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline

app = Flask(__name__)
CORS(app)

# Load the hate speech classification model
classifier = pipeline("text-classification", model="unitary/toxic-bert", truncation=True)

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    text = data.get("text", "")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    result = classifier(text)[0]
    label = result['label']
    score = result['score']

    # Map BERT labels to something simpler (if needed)
    confidence_threshold = 0.5  # Adjust as needed

    mapped_label = "Toxic" if "toxicity" in label.lower() and score >= confidence_threshold else "Not Toxic"

    return jsonify({
        "label": mapped_label,
        "confidence": round(score, 3)
    })

if __name__ == "__main__":
    app.run(debug=True)

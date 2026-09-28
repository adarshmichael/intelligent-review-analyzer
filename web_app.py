
from flask import Flask, render_template, request, jsonify
from app import analyze_complete_review

app = Flask(__name__)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        data = request.get_json()

        review = data.get("review", "").strip()

        if not review:
            return jsonify({
                "error": "Please enter a movie review."
            }), 400

        result = analyze_complete_review(review)

        return jsonify(result)

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=False
    )

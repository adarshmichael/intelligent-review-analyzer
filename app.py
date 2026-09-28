
import re
import joblib
import os
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

# -----------------------------
# LOAD SAVED MODELS
# -----------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

lr_model = joblib.load(os.path.join(BASE_DIR, "logistic_regression_model.pkl"))
tfidf = joblib.load(os.path.join(BASE_DIR, "tfidf_vectorizer.pkl"))
encoder = joblib.load(os.path.join(BASE_DIR, "label_encoder.pkl"))

best_lr_model = lr_model


# -----------------------------
# TEXT PREPROCESSING
# -----------------------------

def clean_text(text):
    text = re.sub(r"<.*?>", " ", text)
    text = text.lower()
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# -----------------------------
# SENTIMENT PREDICTION
# -----------------------------

def predict_sentiment_with_probability(review):

    cleaned_review = clean_text(review)

    review_tfidf = tfidf.transform([cleaned_review])

    prediction = best_lr_model.predict(review_tfidf)[0]

    probabilities = best_lr_model.predict_proba(review_tfidf)[0]

    sentiment = encoder.inverse_transform([prediction])[0]

    negative_probability = probabilities[
        list(encoder.classes_).index("negative")
    ]

    positive_probability = probabilities[
        list(encoder.classes_).index("positive")
    ]

    return (
        sentiment,
        negative_probability,
        positive_probability
    )


# -----------------------------
# EXPLANATION
# -----------------------------

def explain_prediction(review, top_n=5):

    cleaned_review = clean_text(review)

    review_tfidf = tfidf.transform([cleaned_review])

    feature_names = tfidf.get_feature_names_out()

    coefficients = best_lr_model.coef_[0]

    feature_indices = review_tfidf.nonzero()[1]

    explanations = []

    for index in feature_indices:

        feature = feature_names[index]

        # Keep only individual words
        if " " in feature:
            continue

        # Remove stopwords
        if feature in ENGLISH_STOP_WORDS:
            continue

        tfidf_value = review_tfidf[0, index]

        contribution = tfidf_value * coefficients[index]

        explanations.append(
            (feature, contribution)
        )

    explanations.sort(
        key=lambda x: x[1],
        reverse=True
    )

    positive_features = [
        (word, score)
        for word, score in explanations
        if score > 0
    ][:top_n]

    negative_features = [
        (word, score)
        for word, score in explanations
        if score < 0
    ][:top_n]

    return positive_features, negative_features


# -----------------------------
# EMOTION DETECTION
# -----------------------------

from transformers import pipeline

emotion_classifier = pipeline(
    "text-classification",
    model="j-hartmann/emotion-english-distilroberta-base",
    top_k=None
)


def detect_emotions(review):

    results = emotion_classifier(review)

    emotions = results[0]

    emotions = sorted(
        emotions,
        key=lambda x: x["score"],
        reverse=True
    )

    return emotions


def get_top_emotions(review, top_n=3):

    emotions = detect_emotions(review)

    return emotions[:top_n]


# -----------------------------
# REVIEW QUALITY ANALYSIS
# -----------------------------

def analyze_review_quality(review):

    cleaned = clean_text(review)

    words = cleaned.split()

    word_count = len(words)

    character_count = len(review)

    sentences = re.split(r'[.!?]+', review)

    sentences = [
        s.strip()
        for s in sentences
        if s.strip()
    ]

    sentence_count = len(sentences)

    if sentence_count > 0:
        avg_words_per_sentence = (
            word_count / sentence_count
        )
    else:
        avg_words_per_sentence = 0

    if word_count < 10:
        review_length = "Very Short"
    elif word_count < 30:
        review_length = "Short"
    elif word_count < 100:
        review_length = "Moderate"
    else:
        review_length = "Detailed"

    if word_count < 10:
        quality = "Low"
    elif word_count < 30:
        quality = "Basic"
    elif word_count < 100:
        quality = "Good"
    else:
        quality = "Detailed"

    return {
        "word_count": word_count,
        "character_count": character_count,
        "sentence_count": sentence_count,
        "average_words_per_sentence": avg_words_per_sentence,
        "review_length": review_length,
        "quality": quality
    }


# -----------------------------
# ASPECT ANALYSIS
# -----------------------------

aspect_keywords = {

    "Acting": [
        "acting", "actor", "actors",
        "actress", "actresses",
        "performance", "performances", "cast"
    ],

    "Story": [
        "story", "plot", "script",
        "screenplay", "narrative"
    ],

    "Direction": [
        "direction", "director", "directed"
    ],

    "Music": [
        "music", "song", "songs",
        "soundtrack", "score"
    ],

    "Characters": [
        "character", "characters",
        "role", "roles"
    ],

    "Cinematography": [
        "cinematography", "visuals",
        "visual", "camera", "scenery"
    ],

    "Ending": [
        "ending", "finale", "conclusion"
    ],

    "Comedy": [
        "comedy", "humor", "humour",
        "funny", "jokes"
    ]
}


def analyze_aspects(review):

    cleaned_review = clean_text(review)

    detected_aspects = []

    for aspect, keywords in aspect_keywords.items():

        if any(
            keyword in cleaned_review.split()
            for keyword in keywords
        ):

            sentences = re.split(
                r'[.!?]+',
                review
            )

            aspect_sentences = []

            for sentence in sentences:

                sentence_lower = sentence.lower()

                if any(
                    keyword in sentence_lower
                    for keyword in keywords
                ):
                    aspect_sentences.append(
                        sentence.strip()
                    )

            if aspect_sentences:

                aspect_text = " ".join(
                    aspect_sentences
                )

                sentiment, negative_prob, positive_prob = (
                    predict_sentiment_with_probability(
                        aspect_text
                    )
                )

                confidence = max(
                    negative_prob,
                    positive_prob
                )

                detected_aspects.append({
                    "aspect": aspect,
                    "sentiment": sentiment,
                    "confidence": confidence,
                    "text": aspect_text
                })

    return detected_aspects


# -----------------------------
# COMPLETE REVIEW ANALYZER
# -----------------------------

def analyze_complete_review(review):

    sentiment, negative_prob, positive_prob = (
        predict_sentiment_with_probability(review)
    )

    confidence = max(
        negative_prob,
        positive_prob
    )

    positive_features, negative_features = (
        explain_prediction(review)
    )

    quality = analyze_review_quality(review)

    emotions = get_top_emotions(
        review,
        top_n=3
    )

    aspects = analyze_aspects(review)

    return {
        "sentiment": sentiment,
        "confidence": confidence,
        "positive_probability": positive_prob,
        "negative_probability": negative_prob,
        "positive_features": positive_features,
        "negative_features": negative_features,
        "quality": quality,
        "emotions": emotions,
        "aspects": aspects
    }


# -----------------------------
# GRADIO INTERFACE
# -----------------------------

import gradio as gr


def gradio_analyzer(review):

    if not review or not review.strip():
        return (
            "Please enter a movie review.",
            "",
            "",
            "",
            ""
        )

    result = analyze_complete_review(review)

    # -------------------------
    # SENTIMENT
    # -------------------------

    sentiment_output = (
        f"### {result['sentiment'].upper()}\n\n"
        f"**Confidence:** "
        f"{result['confidence']:.2%}\n\n"
        f"**Positive Probability:** "
        f"{result['positive_probability']:.2%}\n\n"
        f"**Negative Probability:** "
        f"{result['negative_probability']:.2%}"
    )

    # -------------------------
    # EMOTIONS
    # -------------------------

    emotion_lines = []

    for emotion in result["emotions"]:
        emotion_lines.append(
            f"**{emotion['label'].title()}** — "
            f"{emotion['score']:.2%}"
        )

    emotion_output = "\n\n".join(
        emotion_lines
    )

    # -------------------------
    # ASPECT ANALYSIS
    # -------------------------

    aspect_lines = []

    for aspect in result["aspects"]:
        aspect_lines.append(
            f"**{aspect['aspect']}** → "
            f"{aspect['sentiment'].title()} "
            f"({aspect['confidence']:.2%})"
        )

    if aspect_lines:
        aspect_output = "\n\n".join(
            aspect_lines
        )
    else:
        aspect_output = (
            "No recognized movie aspects detected."
        )

    # -------------------------
    # EXPLANATION
    # -------------------------

    explanation_output = (
        "### Positive Influences\n\n"
    )

    for word, score in result["positive_features"]:
        explanation_output += (
            f"- ✓ **{word}**\n"
        )

    explanation_output += (
        "\n### Negative Influences\n\n"
    )

    for word, score in result["negative_features"]:
        explanation_output += (
            f"- ✗ **{word}**\n"
        )

    # -------------------------
    # REVIEW QUALITY
    # -------------------------

    q = result["quality"]

    quality_output = (
        f"**Word Count:** "
        f"{q['word_count']}\n\n"

        f"**Character Count:** "
        f"{q['character_count']}\n\n"

        f"**Sentence Count:** "
        f"{q['sentence_count']}\n\n"

        f"**Average Words/Sentence:** "
        f"{q['average_words_per_sentence']:.1f}\n\n"

        f"**Review Length:** "
        f"{q['review_length']}\n\n"

        f"**Quality:** "
        f"{q['quality']}"
    )

    return (
        sentiment_output,
        emotion_output,
        aspect_output,
        explanation_output,
        quality_output
    )


# -----------------------------
# DASHBOARD
# -----------------------------

with gr.Blocks(
    title="Intelligent Review Analyzer"
) as demo:

    gr.Markdown(
        """
        # 🎬 Intelligent Movie Review Analyzer

        Analyze an IMDb-style movie review using
        **Machine Learning + NLP + Emotion Detection**.
        """
    )

    gr.Markdown(
        """
        Enter a movie review below and the system
        will analyze:

        **Sentiment • Confidence • Emotions •
        Aspects • Important Features • Review Quality**
        """
    )

    with gr.Row():

        with gr.Column():

            review_input = gr.Textbox(
                label="Movie Review",
                placeholder=(
                    "Example: The acting was brilliant, "
                    "the story was interesting, and "
                    "the ending was satisfying."
                ),
                lines=8
            )

            analyze_button = gr.Button(
                "🔍 Analyze Review",
                variant="primary"
            )

    gr.Markdown(
        "## 📊 Analysis Results"
    )

    with gr.Row():

        with gr.Column():

            gr.Markdown(
                "### 🎯 Sentiment"
            )

            sentiment_output = gr.Markdown()

        with gr.Column():

            gr.Markdown(
                "### 😊 Emotions"
            )

            emotion_output = gr.Markdown()

    with gr.Row():

        with gr.Column():

            gr.Markdown(
                "### 🎬 Aspect Analysis"
            )

            aspect_output = gr.Markdown()

        with gr.Column():

            gr.Markdown(
                "### 🧠 Explanation"
            )

            explanation_output = gr.Markdown()

    gr.Markdown(
        "### 📝 Review Quality"
    )

    quality_output = gr.Markdown()

    analyze_button.click(
        fn=gradio_analyzer,
        inputs=review_input,
        outputs=[
            sentiment_output,
            emotion_output,
            aspect_output,
            explanation_output,
            quality_output
        ]
    )


# -----------------------------
# LAUNCH
# -----------------------------

if __name__ == "__main__":
    demo.launch(share=True)

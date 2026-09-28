
const reviewInput = document.getElementById("review");
const reviewForm = document.getElementById("reviewForm");
const analyzeButton = document.getElementById("analyzeButton");

const characterCount = document.getElementById("characterCount");

const loading = document.getElementById("loading");
const results = document.getElementById("results");


// -----------------------------
// CHARACTER COUNTER
// -----------------------------

reviewInput.addEventListener("input", () => {

    const count = reviewInput.value.length;

    characterCount.textContent =
        `${count.toLocaleString()} characters`;

});


// -----------------------------
// FORM SUBMISSION
// -----------------------------

reviewForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const review = reviewInput.value.trim();

    if (!review) {
        alert("Please enter a movie review.");
        return;
    }


    // Show loading

    loading.classList.remove("hidden");
    results.classList.add("hidden");

    analyzeButton.disabled = true;

    analyzeButton.querySelector("span:first-child")
        .textContent = "Analyzing...";


    try {

        const response = await fetch("/analyze", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                review: review
            })

        });


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.error || "Analysis failed."
            );

        }


        displayResults(data);


    } catch (error) {

        alert(
            "Something went wrong:\n\n" +
            error.message
        );

    } finally {

        loading.classList.add("hidden");

        analyzeButton.disabled = false;

        analyzeButton.querySelector("span:first-child")
            .textContent = "Analyze Review";

    }

});


// -----------------------------
// DISPLAY RESULTS
// -----------------------------

function displayResults(data) {

    results.classList.remove("hidden");


    // -------------------------
    // SENTIMENT
    // -------------------------

    const sentimentElement =
        document.getElementById("sentiment");

    sentimentElement.textContent =
        data.sentiment.toUpperCase();


    const confidence =
        data.confidence * 100;

    document.getElementById("confidence")
        .textContent =
        `${confidence.toFixed(2)}%`;


    document.getElementById("confidenceBar")
        .style.width =
        `${confidence}%`;


    document.getElementById("positiveProbability")
        .textContent =
        `${(data.positive_probability * 100).toFixed(2)}%`;


    document.getElementById("negativeProbability")
        .textContent =
        `${(data.negative_probability * 100).toFixed(2)}%`;


    // -------------------------
    // EMOTIONS
    // -------------------------

    const emotionsContainer =
        document.getElementById("emotions");

    emotionsContainer.innerHTML = "";


    data.emotions.forEach(emotion => {

        const percentage =
            emotion.score * 100;


        const item =
            document.createElement("div");

        item.className =
            "emotion-item";


        item.innerHTML = `

            <span class="emotion-name">
                ${capitalize(emotion.label)}
            </span>

            <div class="emotion-bar">
                <div
                    class="emotion-fill"
                    style="width:${percentage}%">
                </div>
            </div>

            <span class="emotion-score">
                ${percentage.toFixed(1)}%
            </span>

        `;


        emotionsContainer.appendChild(item);

    });


    // -------------------------
    // REVIEW QUALITY
    // -------------------------

    const quality =
        data.quality;

    const qualityContainer =
        document.getElementById("quality");


    qualityContainer.innerHTML = `

        <div class="quality-item">
            <span>Words</span>
            <strong>${quality.word_count}</strong>
        </div>

        <div class="quality-item">
            <span>Characters</span>
            <strong>${quality.character_count}</strong>
        </div>

        <div class="quality-item">
            <span>Sentences</span>
            <strong>${quality.sentence_count}</strong>
        </div>

        <div class="quality-item">
            <span>Avg Words / Sentence</span>
            <strong>
                ${quality.average_words_per_sentence.toFixed(1)}
            </strong>
        </div>

        <div class="quality-item">
            <span>Length</span>
            <strong>${quality.review_length}</strong>
        </div>

        <div class="quality-item">
            <span>Quality</span>
            <strong>${quality.quality}</strong>
        </div>

    `;


    // -------------------------
    // ASPECTS
    // -------------------------

    const aspectsContainer =
        document.getElementById("aspects");

    aspectsContainer.innerHTML = "";


    if (data.aspects.length === 0) {

        aspectsContainer.innerHTML = `
            <div class="aspect-item">
                <div class="aspect-name">
                    No aspects detected
                </div>
            </div>
        `;

    } else {

        data.aspects.forEach(aspect => {

            const percentage =
                aspect.confidence * 100;


            const item =
                document.createElement("div");

            item.className =
                "aspect-item";


            item.innerHTML = `

                <div class="aspect-name">
                    ${aspect.aspect}
                </div>

                <div class="aspect-sentiment">
                    ${capitalize(aspect.sentiment)}
                </div>

                <div class="aspect-confidence">
                    Confidence:
                    ${percentage.toFixed(2)}%
                </div>

            `;


            aspectsContainer.appendChild(item);

        });

    }


    // -------------------------
    // POSITIVE WORDS
    // -------------------------

    const positiveContainer =
        document.getElementById("positiveWords");

    positiveContainer.innerHTML = "";


    data.positive_features.forEach(item => {

        const word =
            document.createElement("span");

        word.className =
            "word-tag";

        word.textContent =
            `✓ ${item[0]}`;

        positiveContainer.appendChild(word);

    });


    // -------------------------
    // NEGATIVE WORDS
    // -------------------------

    const negativeContainer =
        document.getElementById("negativeWords");

    negativeContainer.innerHTML = "";


    data.negative_features.forEach(item => {

        const word =
            document.createElement("span");

        word.className =
            "word-tag";

        word.textContent =
            `✗ ${item[0]}`;

        negativeContainer.appendChild(word);

    });


    // -------------------------
    // SCROLL TO RESULTS
    // -------------------------

    setTimeout(() => {

        results.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 100);

}


// -----------------------------
// HELPER
// -----------------------------

function capitalize(text) {

    if (!text) {
        return "";
    }

    return text.charAt(0).toUpperCase() +
           text.slice(1);

}

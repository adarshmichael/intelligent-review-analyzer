let sentimentChart = null;
let emotionChart = null;

const reviewInput = document.getElementById("reviewInput");
const charCount = document.getElementById("charCount");
const analyzeButton = document.getElementById("analyzeButton");
const loadingSection = document.getElementById("loadingSection");
const resultsSection = document.getElementById("resultsSection");
const newAnalysisButton = document.getElementById("newAnalysisButton");


/* CHARACTER COUNT */

reviewInput.addEventListener("input", () => {
    charCount.textContent = `${reviewInput.value.length} / 5000`;
});


/* EXAMPLES */

document.querySelectorAll(".example-button").forEach(button => {

    button.addEventListener("click", () => {

        reviewInput.value = button.dataset.review;

        reviewInput.dispatchEvent(new Event("input"));

        reviewInput.focus();

        window.scrollTo({
            top: reviewInput.getBoundingClientRect().top + window.scrollY - 120,
            behavior: "smooth"
        });

    });

});


/* NEW ANALYSIS */

newAnalysisButton.addEventListener("click", () => {

    resultsSection.classList.add("hidden");

    reviewInput.focus();

    window.scrollTo({
        top: reviewInput.getBoundingClientRect().top + window.scrollY - 100,
        behavior: "smooth"
    });

});


/* ANALYZE */

analyzeButton.addEventListener("click", async () => {

    const review = reviewInput.value.trim();

    if (!review) {

        reviewInput.focus();

        return;
    }


    resultsSection.classList.add("hidden");

    loadingSection.classList.remove("hidden");

    analyzeButton.disabled = true;
    analyzeButton.style.opacity = ".6";


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
            throw new Error(data.error || "Analysis failed.");
        }


        displayResults(data);


    } catch (error) {

        alert(error.message);

    } finally {

        loadingSection.classList.add("hidden");

        analyzeButton.disabled = false;
        analyzeButton.style.opacity = "1";

    }

});


/* DISPLAY RESULTS */

function displayResults(data) {

    resultsSection.classList.remove("hidden");


    const sentiment = data.sentiment;
    const confidence = data.confidence * 100;

    const positive = data.positive_probability * 100;
    const negative = data.negative_probability * 100;


    document.getElementById("sentimentValue").textContent = sentiment;

    document.getElementById("confidenceValue").textContent =
        `${confidence.toFixed(0)}%`;

    document.getElementById("positiveProbability").textContent =
        `${positive.toFixed(1)}%`;

    document.getElementById("negativeProbability").textContent =
        `${negative.toFixed(1)}%`;


    document.getElementById("positiveTrack").style.width =
        `${positive}%`;

    document.getElementById("negativeTrack").style.width =
        `${negative}%`;


    renderSentimentChart(positive, negative);

    renderQuality(data.quality);

    renderEmotions(data.emotions);

    renderAspects(data.aspects);

    renderWords(
        data.positive_features,
        data.negative_features
    );


    setTimeout(() => {

        resultsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }, 100);

}


/* SENTIMENT CHART */

function renderSentimentChart(positive, negative) {

    const ctx = document
        .getElementById("sentimentChart")
        .getContext("2d");


    if (sentimentChart) {
        sentimentChart.destroy();
    }


    sentimentChart = new Chart(ctx, {

        type: "doughnut",

        data: {

            labels: ["Positive", "Negative"],

            datasets: [{

                data: [positive, negative],

                backgroundColor: [
                    "#8fc9a4",
                    "#df8f9b"
                ],

                borderWidth: 0,

                hoverOffset: 3

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            cutout: "78%",

            plugins: {

                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label: context =>
                            `${context.label}: ${context.raw.toFixed(1)}%`
                    }
                }

            }

        }

    });

}


/* QUALITY */

function renderQuality(quality) {

    const container =
        document.getElementById("qualityContainer");


    container.innerHTML = `

        <div class="quality-item">
            <span class="quality-value">
                ${quality.word_count}
            </span>
            <span class="quality-name">
                Words
            </span>
        </div>

        <div class="quality-item">
            <span class="quality-value">
                ${quality.character_count}
            </span>
            <span class="quality-name">
                Characters
            </span>
        </div>

        <div class="quality-item">
            <span class="quality-value">
                ${quality.sentence_count}
            </span>
            <span class="quality-name">
                Sentences
            </span>
        </div>

        <div class="quality-item">
            <span class="quality-value">
                ${quality.quality}
            </span>
            <span class="quality-name">
                Detail
            </span>
        </div>

    `;

}


/* EMOTIONS */

function renderEmotions(emotions) {

    const labels = emotions.map(item => capitalize(item.label));
    const values = emotions.map(item => item.score * 100);


    const ctx = document
        .getElementById("emotionChart")
        .getContext("2d");


    if (emotionChart) {
        emotionChart.destroy();
    }


    emotionChart = new Chart(ctx, {

        type: "bar",

        data: {

            labels: labels,

            datasets: [{

                data: values,

                backgroundColor: [
                    "#a99cff",
                    "#8175d7",
                    "#655aa9"
                ],

                borderRadius: 4,

                barThickness: 18

            }]

        },

        options: {

            indexAxis: "y",

            responsive: true,

            maintainAspectRatio: false,

            scales: {

                x: {

                    beginAtZero: true,

                    max: 100,

                    grid: {
                        color: "rgba(255,255,255,.05)"
                    },

                    ticks: {
                        color: "#777873",
                        font: {
                            size: 10
                        },

                        callback: value => `${value}%`
                    }

                },

                y: {

                    grid: {
                        display: false
                    },

                    ticks: {
                        color: "#b7b5b0",
                        font: {
                            size: 11
                        }
                    }

                }

            },

            plugins: {

                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label: context =>
                            `${context.raw.toFixed(1)}%`
                    }
                }

            }

        }

    });

}


/* ASPECTS */

function renderAspects(aspects) {

    const container =
        document.getElementById("aspectsContainer");


    if (!aspects || aspects.length === 0) {

        container.innerHTML = `
            <div style="
                padding:25px 0;
                color:#777873;
                font-size:12px;
            ">
                No specific movie aspects were detected.
            </div>
        `;

        return;
    }


    container.innerHTML = aspects.map(item => {

        const sentimentClass =
            item.sentiment.toLowerCase() === "positive"
                ? "aspect-positive"
                : "aspect-negative";


        return `

            <div class="aspect-row">

                <span class="aspect-name">
                    ${escapeHtml(item.aspect)}
                </span>

                <span class="aspect-text">
                    ${escapeHtml(item.text)}
                </span>

                <span class="aspect-sentiment ${sentimentClass}">
                    ${escapeHtml(item.sentiment)}
                    · ${(item.confidence * 100).toFixed(0)}%
                </span>

            </div>

        `;

    }).join("");

}


/* WORDS */

function renderWords(positive, negative) {

    const positiveContainer =
        document.getElementById("positiveWords");

    const negativeContainer =
        document.getElementById("negativeWords");


    positiveContainer.innerHTML =
        renderWordChips(positive);


    negativeContainer.innerHTML =
        renderWordChips(negative);

}


function renderWordChips(words) {

    if (!words || words.length === 0) {

        return `
            <span style="color:#777873;font-size:11px">
                No strong signals detected
            </span>
        `;

    }


    return words.map(item => {

        return `
            <span class="word-chip">
                ${escapeHtml(item[0])}
            </span>
        `;

    }).join("");

}


/* HELPERS */

function capitalize(value) {

    return value.charAt(0).toUpperCase() +
        value.slice(1);

}


function escapeHtml(value) {

    const div = document.createElement("div");

    div.textContent = value;

    return div.innerHTML;

}

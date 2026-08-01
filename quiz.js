document.addEventListener("DOMContentLoaded", () => {
  const nextButton = document.getElementById("next-btn");
  const backButton = document.getElementById("back-btn");
  const questionText = document.getElementById("question-text");
  const questionNumber = document.getElementById("question-number");
  const optionsContainer = document.getElementById("options");
  const explanation = document.getElementById("explanation");
  const languageSwitch = document.getElementById("language-switch");
  const progressText = document.getElementById("progress");
  const accuracyText = document.getElementById("accuracy");
  const sessionTitle = document.getElementById("session-title");

  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };
  const questions = readJSON("currentQuestions", []);
  const session = readJSON("currentSession", { key: "unknown", label: "章节答题", mode: "practice" });
  if (!questions.length) {
    alert("题库加载失败，请返回重新选择章节。");
    window.location.href = "index.html";
    return;
  }

  let language = localStorage.getItem("language") || "cn";
  let currentIndex = 0;
  let answeredCount = 0;
  let correctCount = 0;
  let answered = false;
  let selectedIndex = null;
  let mistakes = readJSON("mistakesV15", []);

  const questionIdentity = (question) => question.question_id || question.question_en;
  const setMistakes = () => localStorage.setItem("mistakesV15", JSON.stringify(mistakes));

  function updateLanguageButton() {
    languageSwitch.textContent = language === "cn" ? "Switch to English" : "切换至中文";
  }

  function renderQuestion() {
    const question = questions[currentIndex];
    sessionTitle.textContent = session.label;
    questionNumber.textContent = question.source_question_no
      ? `题号 ${question.source_question_no} · ${question.topic_cn || question.topic}`
      : `Question ${currentIndex + 1}`;
    questionText.textContent = language === "cn" ? question.question_cn : question.question_en;
    optionsContainer.replaceChildren(...question.options.map((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "option-button";
      button.dataset.index = String(index);
      const letter = document.createElement("span");
      const text = document.createElement("span");
      letter.textContent = String.fromCharCode(65 + index);
      text.textContent = language === "cn" ? option.cn : option.en;
      button.append(letter, text);
      button.addEventListener("click", () => checkAnswer(index));
      if (answered) {
        button.disabled = true;
        if (index === question.correct) button.classList.add("correct");
        if (index === selectedIndex && index !== question.correct) button.classList.add("wrong");
      }
      return button;
    }));
    progressText.textContent = `${currentIndex + 1} / ${questions.length}`;
    accuracyText.textContent = answeredCount ? `${Math.round(correctCount / answeredCount * 100)}%` : "0%";
    renderExplanation();
  }

  function renderExplanation() {
    if (!answered) {
      explanation.classList.add("hidden");
      nextButton.classList.add("hidden");
      return;
    }
    const question = questions[currentIndex];
    const body = language === "cn" ? question.explanation_cn : question.explanation_en;
    explanation.replaceChildren();
    const heading = document.createElement("h3");
    const paragraph = document.createElement("p");
    heading.textContent = language === "cn" ? "答案解析" : "Explanation";
    paragraph.textContent = body;
    explanation.append(heading, paragraph);
    if (question.code_reference) {
      const reference = document.createElement("p");
      reference.className = "code-reference";
      const label = document.createElement("strong");
      label.textContent = `${language === "cn" ? "法规参考" : "Code reference"}：`;
      reference.append(label, document.createTextNode(question.code_reference));
      explanation.append(reference);
    }
    explanation.classList.remove("hidden");
    nextButton.textContent = currentIndex === questions.length - 1 ? (language === "cn" ? "完成本节" : "Finish") : (language === "cn" ? "下一题" : "Next");
    nextButton.classList.remove("hidden");
  }

  function checkAnswer(index) {
    if (answered) return;
    const question = questions[currentIndex];
    answered = true;
    selectedIndex = index;
    answeredCount += 1;
    const id = questionIdentity(question);
    if (index === question.correct) {
      correctCount += 1;
      mistakes = mistakes.filter((item) => questionIdentity(item) !== id);
    } else if (!mistakes.some((item) => questionIdentity(item) === id)) {
      mistakes.push(question);
    }
    setMistakes();
    renderQuestion();
  }

  function finishSession() {
    const score = Math.round(correctCount / questions.length * 100);
    if (session.mode !== "mistakes") {
      const progress = readJSON("studyProgressV15", {});
      progress[session.key] = { completed: true, score, completedAt: new Date().toISOString() };
      localStorage.setItem("studyProgressV15", JSON.stringify(progress));
    }
    alert(`本节完成！正确率：${score}%`);
    window.location.href = "index.html";
  }

  languageSwitch.addEventListener("click", () => {
    language = language === "cn" ? "en" : "cn";
    localStorage.setItem("language", language);
    updateLanguageButton();
    renderQuestion();
  });
  nextButton.addEventListener("click", () => {
    if (currentIndex >= questions.length - 1) return finishSession();
    currentIndex += 1;
    answered = false;
    selectedIndex = null;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  backButton.addEventListener("click", () => { window.location.href = "index.html"; });

  updateLanguageButton();
  renderQuestion();
});

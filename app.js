window.addEventListener("DOMContentLoaded", () => {
  const dbSelect = document.getElementById("db-select");
  const topicField = document.getElementById("topic-field");
  const topicSelect = document.getElementById("topic-select");
  const unitLabel = document.getElementById("unit-label");
  const unitSelect = document.getElementById("unit-select");
  const startButton = document.getElementById("start-btn");
  const reviewButton = document.getElementById("review-btn");
  const clearProgressButton = document.getElementById("clear-progress-btn");
  const progressList = document.getElementById("progress-list");
  const statusMessage = document.getElementById("status-message");

  const state = { questions: [], topics: [] };
  const dbFiles = { law: "questions_law.json", skill: "questions_skill.json" };

  const readJSON = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  };

  function unitKey(question) {
    if (dbSelect.value === "law") return `law:${question.topic}:${question.section}`;
    return `skill:${question.chapter}`;
  }

  function setStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("error", isError);
  }

  async function loadDatabase() {
    setStatus("正在加载题库…");
    startButton.disabled = true;
    try {
      const response = await fetch(dbFiles[dbSelect.value]);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.questions = await response.json();
      if (!Array.isArray(state.questions) || !state.questions.length) throw new Error("题库为空");

      if (dbSelect.value === "law") {
        topicField.hidden = false;
        unitLabel.textContent = "小节（每节最多50题）";
        populateTopics();
      } else {
        topicField.hidden = true;
        unitLabel.textContent = "章节";
        populateSkillChapters();
      }
      renderProgress();
      startButton.disabled = false;
      setStatus(`已加载 ${state.questions.length.toLocaleString()} 道题`);
    } catch (error) {
      console.error(error);
      setStatus("题库加载失败，请刷新页面后重试。", true);
    }
  }

  function populateTopics() {
    const topicMap = new Map();
    state.questions.forEach((question) => {
      if (!topicMap.has(question.topic)) {
        topicMap.set(question.topic, { en: question.topic, cn: question.topic_cn, chapter: question.chapter });
      }
    });
    state.topics = [...topicMap.values()].sort((a, b) => a.chapter - b.chapter);
    topicSelect.replaceChildren(...state.topics.map((topic) => {
      const option = document.createElement("option");
      option.value = topic.en;
      option.textContent = `${topic.chapter}. ${topic.cn} / ${topic.en}`;
      return option;
    }));
    populateLawSections();
  }

  function populateLawSections() {
    const topic = topicSelect.value;
    const questions = state.questions.filter((question) => question.topic === topic);
    const sections = [...new Set(questions.map((question) => question.section))].sort((a, b) => a - b);
    unitSelect.replaceChildren(...sections.map((section) => {
      const sectionQuestions = questions.filter((question) => question.section === section);
      const option = document.createElement("option");
      option.value = String(section);
      option.textContent = `第 ${section} 节 · ${sectionQuestions.length} 题（${sectionQuestions[0].source_question_no}–${sectionQuestions.at(-1).source_question_no}）`;
      return option;
    }));
  }

  function populateSkillChapters() {
    const chapters = [...new Set(state.questions.map((question) => question.chapter))].sort((a, b) => a - b);
    unitSelect.replaceChildren(...chapters.map((chapter) => {
      const count = state.questions.filter((question) => question.chapter === chapter).length;
      const option = document.createElement("option");
      option.value = String(chapter);
      option.textContent = `Chapter ${chapter} · ${count} 题`;
      return option;
    }));
  }

  function selectedQuestions() {
    if (dbSelect.value === "law") {
      const section = Number(unitSelect.value);
      return state.questions.filter((question) => question.topic === topicSelect.value && question.section === section);
    }
    const chapter = Number(unitSelect.value);
    return state.questions.filter((question) => question.chapter === chapter);
  }

  function startSession(questions, mode = "practice") {
    if (!questions.length) return setStatus("当前选择没有题目。", true);
    const first = questions[0];
    const key = mode === "mistakes" ? "mistakes" : unitKey(first);
    const label = mode === "mistakes"
      ? `错题复习 · ${questions.length}题`
      : dbSelect.value === "law"
        ? `${first.topic_cn} · 第${first.section}节`
        : `技能题库 · Chapter ${first.chapter}`;
    localStorage.setItem("currentQuestions", JSON.stringify(questions));
    localStorage.setItem("currentQuestionIndex", "0");
    localStorage.setItem("currentSession", JSON.stringify({ key, label, mode, db: dbSelect.value }));
    window.location.href = "quiz.html";
  }

  function renderProgress() {
    const progress = readJSON("studyProgressV15", {});
    const groups = new Map();
    state.questions.forEach((question) => {
      const key = unitKey(question);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(question);
    });
    progressList.replaceChildren(...[...groups.entries()].map(([key, questions]) => {
      const first = questions[0];
      const record = progress[key];
      const card = document.createElement("article");
      card.className = `progress-card ${record?.completed ? "completed" : ""}`;
      const title = dbSelect.value === "law"
        ? `${first.topic_cn} · 第${first.section}节`
        : `技能题库 · Chapter ${first.chapter}`;
      const heading = document.createElement("h3");
      const count = document.createElement("p");
      const status = document.createElement("span");
      heading.textContent = title;
      count.textContent = `${questions.length}题`;
      status.textContent = record?.completed ? `✅ 已完成 · ${record.score}%` : "○ 未完成";
      card.append(heading, count, status);
      return card;
    }));
  }

  dbSelect.addEventListener("change", loadDatabase);
  topicSelect.addEventListener("change", () => { populateLawSections(); renderProgress(); });
  startButton.addEventListener("click", () => startSession(selectedQuestions()));
  reviewButton.addEventListener("click", () => {
    const mistakes = readJSON("mistakesV15", []);
    if (!mistakes.length) return setStatus("当前没有错题。", true);
    startSession(mistakes, "mistakes");
  });
  clearProgressButton.addEventListener("click", () => {
    if (!window.confirm("确定清除所有V1.5学习进度吗？错题记录不会被删除。")) return;
    localStorage.removeItem("studyProgressV15");
    renderProgress();
    setStatus("学习进度已清除。错题记录已保留。");
  });

  loadDatabase();
});

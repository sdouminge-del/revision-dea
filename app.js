(function () {
  "use strict";

  const STORAGE_KEY = "revision-dea-fiches-v1";
  const DEFAULT_SESSION_SIZE = 10;
  const fiches = Array.isArray(window.DEA_FICHES) ? window.DEA_FICHES : [];

  const el = {
    searchInput: document.getElementById("searchInput"),
    themeFilter: document.getElementById("themeFilter"),
    ficheList: document.getElementById("ficheList"),
    visibleCount: document.getElementById("visibleCount"),
    knownCount: document.getElementById("knownCount"),
    progressLabel: document.getElementById("progressLabel"),
    progressBar: document.getElementById("progressBar"),
    todayTitle: document.getElementById("todayTitle"),
    activeSource: document.getElementById("activeSource"),
    activeTitle: document.getElementById("activeTitle"),
    tagList: document.getElementById("tagList"),
    favoriteBtn: document.getElementById("favoriteBtn"),
    openDocBtn: document.getElementById("openDocBtn"),
    methodList: document.getElementById("methodList"),
    notesInput: document.getElementById("notesInput"),
    statusButtons: Array.from(document.querySelectorAll("[data-status]")),
    filterButtons: Array.from(document.querySelectorAll("[data-filter]")),
    startSessionBtn: document.getElementById("startSessionBtn"),
    quizTitle: document.getElementById("quizTitle"),
    quizCounter: document.getElementById("quizCounter"),
    quizQuestion: document.getElementById("quizQuestion"),
    quizAnswer: document.getElementById("quizAnswer"),
    showAnswerBtn: document.getElementById("showAnswerBtn"),
    missedBtn: document.getElementById("missedBtn"),
    passedBtn: document.getElementById("passedBtn")
  };

  const app = {
    selectedId: "",
    filter: "all",
    theme: "all",
    query: "",
    session: [],
    sessionIndex: 0,
    records: loadRecords()
  };

  init();

  function init() {
    populateThemes();
    bindEvents();
    renderAll();
  }

  function bindEvents() {
    el.searchInput.addEventListener("input", function (event) {
      app.query = event.target.value;
      renderAll();
    });

    el.themeFilter.addEventListener("change", function (event) {
      app.theme = event.target.value;
      renderAll();
    });

    el.filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        app.filter = button.dataset.filter;
        renderAll();
      });
    });

    el.statusButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        if (!app.selectedId) return;
        setStatus(app.selectedId, button.dataset.status);
      });
    });

    el.favoriteBtn.addEventListener("click", function () {
      if (!app.selectedId) return;
      const record = getRecord(app.selectedId);
      record.favorite = !record.favorite;
      record.lastSeen = new Date().toISOString();
      saveRecords();
      renderAll();
    });

    el.notesInput.addEventListener("input", function () {
      if (!app.selectedId) return;
      const record = getRecord(app.selectedId);
      record.notes = el.notesInput.value;
      record.lastSeen = new Date().toISOString();
      saveRecords();
    });

    el.startSessionBtn.addEventListener("click", startSession);
    el.showAnswerBtn.addEventListener("click", revealAnswer);
    el.missedBtn.addEventListener("click", function () {
      answerCurrent("todo");
    });
    el.passedBtn.addEventListener("click", function () {
      answerCurrent("known");
    });
  }

  function loadRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveRecords() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(app.records));
  }

  function getRecord(id) {
    if (!app.records[id]) {
      app.records[id] = {
        status: "todo",
        favorite: false,
        notes: "",
        lastSeen: ""
      };
    }
    return app.records[id];
  }

  function setStatus(id, status) {
    const record = getRecord(id);
    record.status = status;
    record.lastSeen = new Date().toISOString();
    saveRecords();
    renderAll();
  }

  function populateThemes() {
    const themes = Array.from(new Set(fiches.flatMap(function (fiche) {
      return fiche.tags || [];
    }))).sort(function (a, b) {
      return a.localeCompare(b, "fr");
    });

    el.themeFilter.innerHTML = "";
    el.themeFilter.appendChild(new Option("Tous les themes", "all"));
    themes.forEach(function (theme) {
      el.themeFilter.appendChild(new Option(theme, theme));
    });
  }

  function renderAll() {
    syncFilterButtons();
    const visible = getVisibleFiches();
    ensureSelection(visible);
    renderStats(visible);
    renderFicheList(visible);
    renderActiveFiche();
  }

  function syncFilterButtons() {
    el.filterButtons.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.filter === app.filter);
    });
  }

  function getVisibleFiches() {
    const query = normalizeText(app.query);
    return fiches.filter(function (fiche) {
      const record = getRecord(fiche.id);
      if (app.theme !== "all" && !(fiche.tags || []).includes(app.theme)) return false;
      if (app.filter === "todo" && record.status !== "todo") return false;
      if (app.filter === "learning" && record.status !== "learning") return false;
      if (app.filter === "known" && record.status !== "known") return false;
      if (app.filter === "favorite" && !record.favorite) return false;
      if (!query) return true;

      const haystack = normalizeText([
        fiche.title,
        fiche.source,
        fiche.path,
        (fiche.tags || []).join(" ")
      ].join(" "));
      return haystack.includes(query);
    });
  }

  function ensureSelection(visible) {
    const selectedStillVisible = visible.some(function (fiche) {
      return fiche.id === app.selectedId;
    });
    if (selectedStillVisible) return;
    app.selectedId = visible.length ? visible[0].id : "";
  }

  function renderStats(visible) {
    const revisionFiches = fiches;
    const known = revisionFiches.filter(function (fiche) {
      return getRecord(fiche.id).status === "known";
    }).length;
    const learning = revisionFiches.filter(function (fiche) {
      return getRecord(fiche.id).status === "learning";
    }).length;
    const total = revisionFiches.length || 1;
    const due = Math.max(total - known, 0);
    const percent = Math.round((known / total) * 100);

    el.visibleCount.textContent = String(visible.length);
    el.knownCount.textContent = String(known);
    el.progressLabel.textContent = percent + "%";
    el.progressBar.style.width = percent + "%";
    el.todayTitle.textContent = Math.min(DEFAULT_SESSION_SIZE, due) + " fiches a travailler";

    if (learning > 0 && due > 0) {
      el.todayTitle.textContent = Math.min(DEFAULT_SESSION_SIZE, due) + " fiches, dont " + learning + " en cours";
    }
  }

  function renderFicheList(visible) {
    el.ficheList.innerHTML = "";

    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "fiche-item";
      empty.innerHTML = "<span class=\"fiche-item-title\">Aucune fiche trouvee</span><span class=\"fiche-item-meta\">Essaie un autre mot-cle ou un autre filtre.</span>";
      el.ficheList.appendChild(empty);
      return;
    }

    visible.forEach(function (fiche) {
      const record = getRecord(fiche.id);
      const button = document.createElement("button");
      button.className = "fiche-item";
      button.type = "button";
      button.classList.toggle("is-active", fiche.id === app.selectedId);
      button.addEventListener("click", function () {
        app.selectedId = fiche.id;
        renderAll();
      });

      const source = fiche.source || "Dossier";
      const favorite = record.favorite ? "Favori" : "";
      button.innerHTML = [
        "<span class=\"fiche-item-title\">" + escapeHtml(fiche.title) + "</span>",
        "<span class=\"fiche-item-meta\">",
        "<span class=\"status-dot " + escapeHtml(record.status) + "\"></span>",
        "<span>" + escapeHtml(statusLabel(record.status)) + "</span>",
        "<span>Fiche</span>",
        favorite ? "<span>" + favorite + "</span>" : "",
        "</span>",
        "<span class=\"fiche-item-meta\">" + escapeHtml(source) + "</span>"
      ].join("");
      el.ficheList.appendChild(button);
    });
  }

  function renderActiveFiche() {
    const fiche = findFiche(app.selectedId);
    if (!fiche) {
      el.activeSource.textContent = "Fiche selectionnee";
      el.activeTitle.textContent = "Choisis une fiche pour commencer";
      el.tagList.innerHTML = "";
      el.methodList.innerHTML = "";
      el.notesInput.value = "";
      el.favoriteBtn.classList.remove("is-active");
      el.favoriteBtn.textContent = "☆";
      el.openDocBtn.classList.add("is-disabled");
      return;
    }

    const record = getRecord(fiche.id);
    record.lastSeen = record.lastSeen || new Date().toISOString();
    saveRecords();

    el.activeSource.textContent = fiche.source || "Fiche";
    el.activeTitle.textContent = fiche.title;
    el.openDocBtn.href = "../" + fiche.path.split("/").map(encodeURIComponent).join("/");
    el.openDocBtn.classList.remove("is-disabled");
    el.notesInput.value = record.notes || "";

    el.favoriteBtn.classList.toggle("is-active", Boolean(record.favorite));
    el.favoriteBtn.textContent = record.favorite ? "★" : "☆";
    el.favoriteBtn.setAttribute("aria-label", record.favorite ? "Retirer des favoris" : "Ajouter aux favoris");

    el.statusButtons.forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.status === record.status);
    });

    renderTags(fiche);
    renderMethod(fiche);
  }

  function renderTags(fiche) {
    const tags = fiche.tags && fiche.tags.length ? fiche.tags : ["revision"];
    el.tagList.innerHTML = tags.map(function (tag, index) {
      return "<span class=\"tag " + (index % 2 ? "alt" : "") + "\">" + escapeHtml(tag) + "</span>";
    }).join("");
  }

  function renderMethod(fiche) {
    const steps = buildMethodSteps(fiche);
    el.methodList.innerHTML = steps.map(function (step) {
      return "<li>" + escapeHtml(step) + "</li>";
    }).join("");
  }

  function startSession() {
    const pool = getVisibleFiches().filter(function (fiche) {
      const record = getRecord(fiche.id);
      return record.status !== "known";
    });

    app.session = shuffle(pool).slice(0, DEFAULT_SESSION_SIZE);
    app.sessionIndex = 0;

    if (!app.session.length) {
      el.quizTitle.textContent = "Tout est acquis";
      el.quizCounter.textContent = "0/0";
      el.quizQuestion.textContent = "Remets certaines fiches en cours ou a revoir pour relancer une session.";
      el.quizAnswer.classList.add("is-hidden");
      return;
    }

    app.selectedId = app.session[0].id;
    renderAll();
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    const fiche = app.session[app.sessionIndex];
    if (!fiche) {
      el.quizTitle.textContent = "Session terminee";
      el.quizCounter.textContent = app.session.length + "/" + app.session.length;
      el.quizQuestion.textContent = "Bravo. Les fiches reussies sont passees en acquises, les autres restent a revoir.";
      el.quizAnswer.classList.add("is-hidden");
      el.missedBtn.classList.remove("is-active");
      el.passedBtn.classList.remove("is-active");
      renderAll();
      return;
    }

    app.selectedId = fiche.id;
    el.quizTitle.textContent = fiche.title;
    el.quizCounter.textContent = (app.sessionIndex + 1) + "/" + app.session.length;
    el.quizQuestion.textContent = buildQuestion(fiche);
    el.quizAnswer.innerHTML = buildAnswerHtml(fiche);
    el.quizAnswer.classList.add("is-hidden");
    el.missedBtn.classList.remove("is-active");
    el.passedBtn.classList.remove("is-active");
    renderAll();
  }

  function revealAnswer() {
    el.quizAnswer.classList.toggle("is-hidden");
  }

  function answerCurrent(status) {
    const fiche = app.session[app.sessionIndex];
    if (!fiche) return;
    setStatus(fiche.id, status);
    app.sessionIndex += 1;
    renderQuizQuestion();
  }

  function buildQuestion(fiche) {
    const title = fiche.title;
    const tags = fiche.tags || [];
    if (hasTag(tags, "douleur")) return "Comment evalues-tu la douleur et comment formules-tu la transmission ?";
    if (hasTag(tags, "bilan")) return "Sans regarder la fiche, explique comment tu construis le bilan et quelles informations tu transmets.";
    if (hasTag(tags, "respiratoire")) return "Quels signes respiratoires dois-tu rechercher, mesurer et transmettre pour cette fiche ?";
    if (hasTag(tags, "circulatoire")) return "Quels signes circulatoires, constantes et risques dois-tu surveiller ?";
    if (hasTag(tags, "manutention")) return "Explique la technique, les points de securite et les roles de chacun.";
    if (hasTag(tags, "communication")) return "Quelle posture de communication adoptes-tu et quelles erreurs dois-tu eviter ?";
    if (hasTag(tags, "droits")) return "Quels droits du patient ou regles de confidentialite sont concernes ?";
    if (hasTag(tags, "hygiene")) return "Quels gestes d'hygiene, de confort et de prevention dois-tu appliquer ?";
    if (hasTag(tags, "urgence")) return "Quels signes d'alerte te feraient demander un renfort ou transmettre rapidement ?";
    if (hasTag(tags, "transport")) return "Quels elements conditionnent le type de transport et l'installation du patient ?";
    if (hasTag(tags, "e-sante")) return "Quelles informations dois-tu tracer, partager ou proteger ?";
    if (hasTag(tags, "anatomie")) return "Replace les notions anatomiques essentielles et donne un exemple utile sur le terrain.";
    return "Presente la fiche \"" + title + "\" en 60 secondes : definition, points cles, risques et conduite a tenir.";
  }

  function buildAnswerHtml(fiche) {
    const points = buildAnswerPoints(fiche);
    return [
      "<strong>A comparer avec ta fiche :</strong>",
      "<ul>",
      points.map(function (point) {
        return "<li>" + escapeHtml(point) + "</li>";
      }).join(""),
      "</ul>"
    ].join("");
  }

  function buildAnswerPoints(fiche) {
    const tags = fiche.tags || [];
    const points = [
      "Definition simple du sujet et vocabulaire important.",
      "Ce que l'ambulancier observe, mesure ou demande.",
      "Ce qui doit etre transmis clairement a l'equipe soignante."
    ];

    if (hasTag(tags, "bilan")) {
      points.push("Identite, motif, contexte, constantes, douleur, evolution et priorites.");
    }
    if (hasTag(tags, "douleur")) {
      points.push("Localisation, intensite, type de douleur, evolution, facteurs aggravants et soulageants.");
    }
    if (hasTag(tags, "respiratoire")) {
      points.push("Frequence respiratoire, saturation, signes de detresse, position et tolerance.");
    }
    if (hasTag(tags, "circulatoire")) {
      points.push("Pouls, pression arterielle, coloration, sueurs, malaise, signes de choc.");
    }
    if (hasTag(tags, "manutention")) {
      points.push("Securite du patient, ergonomie du soignant, materiel adapte, coordination.");
    }
    if (hasTag(tags, "communication")) {
      points.push("Ecoute, reformulation, consentement, adaptation a la personne et a la situation.");
    }
    if (hasTag(tags, "droits")) {
      points.push("Secret professionnel, respect de la dignite, consentement et limites du partage d'information.");
    }
    if (hasTag(tags, "hygiene")) {
      points.push("Hygiene des mains, prevention du risque infectieux, confort, intimite et surveillance.");
    }
    if (hasTag(tags, "transport")) {
      points.push("Prescription, etat clinique, installation, securite et conditions du trajet.");
    }
    return points.slice(0, 6);
  }

  function buildMethodSteps(fiche) {
    const steps = [
      "Ouvre la fiche, lis le titre et repere 3 mots-cles.",
      "Cache le document et explique le sujet a voix haute en moins d'une minute.",
      "Rouvre la fiche et note uniquement ce que tu as oublie."
    ];

    const tags = fiche.tags || [];
    if (hasTag(tags, "bilan")) {
      steps.push("Refais une transmission orale courte : contexte, constantes, evolution, demande.");
    } else if (hasTag(tags, "manutention")) {
      steps.push("Mime mentalement la sequence : preparation, roles, geste, securisation.");
    } else if (hasTag(tags, "communication")) {
      steps.push("Imagine une phrase adaptee au patient, puis une phrase de transmission a l'equipe.");
    } else {
      steps.push("Termine par une question : qu'est-ce que je dois absolument transmettre ?");
    }

    return steps;
  }

  function findFiche(id) {
    return fiches.find(function (fiche) {
      return fiche.id === id;
    });
  }

  function hasTag(tags, tag) {
    return tags.includes(tag);
  }

  function statusLabel(status) {
    if (status === "known") return "Acquise";
    if (status === "learning") return "En cours";
    return "A revoir";
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function shuffle(items) {
    const copy = items.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      const value = copy[index];
      copy[index] = copy[randomIndex];
      copy[randomIndex] = value;
    }
    return copy;
  }
})();

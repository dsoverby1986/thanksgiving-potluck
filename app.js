(function () {
  "use strict";

  // Keep in sync with the category check in supabase/schema.sql.
  var CATEGORIES = [
    ["appetizer", "Appetizers"],
    ["main", "Mains"],
    ["side", "Sides"],
    ["bread", "Bread"],
    ["dessert", "Dessert"],
    ["drinks", "Drinks"],
    ["supplies", "Supplies"],
    ["other", "Other"],
  ];

  var form = document.getElementById("dish-form");
  var nameInput = document.getElementById("guest-name");
  var dishInput = document.getElementById("dish");
  var categoryInput = document.getElementById("category");
  var notesInput = document.getElementById("notes");
  var submitButton = document.getElementById("submit");
  var formStatus = document.getElementById("form-status");
  var banner = document.getElementById("banner");
  var summary = document.getElementById("summary");
  var menu = document.getElementById("menu");
  var menuNote = document.getElementById("menu-note");
  var menuSection = document.getElementById("menu-section");
  var refreshButton = document.getElementById("refresh");
  var title = document.getElementById("event-title");
  var dateLine = document.getElementById("event-date");
  var noteLine = document.getElementById("event-note");

  var settings = readSettings();
  var saving = false;
  var loadToken = 0;

  applyCopy(settings.config);
  fillCategories();

  form.addEventListener("submit", onSubmit);
  form.addEventListener("input", function () {
    if (saving) return;
    setFormStatus("");
    clearInvalid();
  });
  refreshButton.addEventListener("click", function () {
    if (!settings.configured) {
      showMenuMessage("Connect Supabase in config.js, then the menu will show here.");
      return;
    }
    loadMenu({ quiet: menu.dataset.loaded === "true" });
  });

  if (!settings.configured) {
    showMenuMessage("Connect Supabase in config.js, then the menu will show here.");
    return;
  }

  banner.hidden = true;
  loadMenu();
  setInterval(function () {
    if (!document.hidden) loadMenu({ quiet: true, silent: true });
  }, 20000);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) loadMenu({ quiet: true, silent: true });
  });

  function readSettings() {
    var config = window.POTLUCK_CONFIG || {};
    var supabaseUrl = "";
    try {
      supabaseUrl = normalizeUrl(config.supabaseUrl || "");
    } catch (error) {
      supabaseUrl = "";
    }
    var supabaseKey = String(config.supabaseKey || config.supabaseAnonKey || "").trim();
    if (isSecretKey(supabaseKey)) {
      banner.textContent =
        "config.js has a secret key. Replace it with the publishable key, then reload this page.";
      return { config: config, supabaseUrl: "", supabaseKey: "", configured: false };
    }
    return {
      config: config,
      supabaseUrl: supabaseUrl,
      supabaseKey: supabaseKey,
      configured: Boolean(supabaseUrl && supabaseKey.length >= 20),
    };
  }

  function normalizeUrl(value) {
    var url = new URL(String(value).trim());
    if (url.protocol !== "https:") return "";
    var path = url.pathname.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
    return url.origin + (path && path !== "/" ? path : "");
  }

  function isSecretKey(key) {
    if (!key) return false;
    if (key.indexOf("sb_secret_") === 0) return true;
    if (key.indexOf("eyJ") !== 0) return false;
    var segment = key.split(".")[1];
    if (!segment) return false;
    try {
      var padded = segment.replace(/-/g, "+").replace(/_/g, "/");
      while (padded.length % 4) padded += "=";
      var json = JSON.parse(atob(padded));
      return json.role === "service_role";
    } catch (error) {
      return false;
    }
  }

  function applyCopy(config) {
    var eventTitle = clean(config.eventTitle || "") || "Thanksgiving";
    var eventDate = clean(config.eventDate || "");
    var eventNote = clean(config.eventNote || "");
    title.textContent = eventTitle;
    dateLine.textContent = eventDate;
    dateLine.hidden = !eventDate;
    noteLine.textContent = eventNote;
    noteLine.hidden = !eventNote;
    document.title = eventTitle + " menu";
  }

  function fillCategories() {
    CATEGORIES.forEach(function (entry) {
      var option = document.createElement("option");
      option.value = entry[0];
      option.textContent = entry[1];
      categoryInput.appendChild(option);
    });
  }

  function onSubmit(event) {
    event.preventDefault();
    if (saving) return;

    var fields = {
      guest_name: clean(nameInput.value),
      dish: clean(dishInput.value),
      category: categoryInput.value,
      notes: clean(notesInput.value),
    };
    clearInvalid();

    if (form.elements.fax_number.value) {
      setFormStatus("Couldn't add that dish. Please try again.", "err");
      return;
    }

    var problem = validate(fields);
    if (problem) {
      setFormStatus(problem.message, "err");
      problem.field.setAttribute("aria-invalid", "true");
      problem.field.focus();
      return;
    }

    if (!settings.configured) {
      setFormStatus(
        "Saving isn't connected yet. Add your Supabase URL and publishable key in config.js.",
        "err"
      );
      return;
    }

    saving = true;
    setBusy(true);
    setFormStatus("Saving…");

    createDish(fields)
      .then(function (created) {
        var row = Array.isArray(created) ? created[0] : created;
        dishInput.value = "";
        notesInput.value = "";
        form.elements.fax_number.value = "";
        saving = false;
        setBusy(false);
        setFormStatus("Added " + fields.dish + ".", "ok");
        dishInput.focus();
        if (window.matchMedia("(max-width: 859px)").matches) {
          menuSection.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
            block: "start",
          });
        }
        return loadMenu({ quiet: true, silent: true, highlightId: row && row.id });
      })
      .catch(function (error) {
        console.error(error);
        setFormStatus(describe(error, "save"), "err");
        saving = false;
        setBusy(false);
      });
  }

  function validate(fields) {
    if (!fields.guest_name) return { message: "Add your name.", field: nameInput };
    if (fields.guest_name.length > 80) return { message: "Use a shorter name (80 characters or fewer).", field: nameInput };
    if (!fields.dish) return { message: "Add what you're bringing.", field: dishInput };
    if (fields.dish.length > 120) {
      return { message: "Use a shorter dish name (120 characters or fewer).", field: dishInput };
    }
    if (!fields.category || !categoryLabel(fields.category)) {
      return { message: "Choose a category.", field: categoryInput };
    }
    if (fields.notes.length > 280) return { message: "Use a shorter note (280 characters or fewer).", field: notesInput };
    return null;
  }

  function clearInvalid() {
    [nameInput, dishInput, categoryInput, notesInput].forEach(function (field) {
      field.removeAttribute("aria-invalid");
    });
  }

  function setBusy(busy) {
    [nameInput, dishInput, categoryInput, notesInput, submitButton].forEach(function (field) {
      field.disabled = busy;
    });
    submitButton.textContent = busy ? "Saving…" : "Add to the menu";
  }

  function loadMenu(options) {
    var opts = options || {};
    var token = ++loadToken;
    if (!opts.quiet) {
      setNote(menuNote, "");
      showMenuMessage("Loading the menu…");
    } else if (!opts.silent && menu.dataset.loaded === "true") {
      setNote(menuNote, "Refreshing…");
    }

    return fetchDishes()
      .then(function (dishes) {
        if (token !== loadToken) return;
        renderMenu(dishes, opts.highlightId);
        setNote(menuNote, "");
      })
      .catch(function (error) {
        if (token !== loadToken) return;
        console.error(error);
        var message = describe(error, "load");
        if (opts.quiet && menu.dataset.loaded === "true") setNote(menuNote, message);
        else showMenuMessage(message);
      });
  }

  function fetchDishes() {
    return fetch(apiUrl("dishes?select=id,guest_name,dish,category,notes,created_at&order=created_at.asc"), {
      headers: apiHeaders(),
    }).then(function (response) {
      if (!response.ok) return rejectResponse(response);
      return response.json().then(function (data) {
        if (!Array.isArray(data)) throw new Error("Unexpected response");
        return data;
      });
    });
  }

  function createDish(fields) {
    return fetch(apiUrl("dishes"), {
      method: "POST",
      headers: apiHeaders({
        "Content-Type": "application/json",
        Prefer: "return=representation",
      }),
      body: JSON.stringify(fields),
    }).then(function (response) {
      if (!response.ok) return rejectResponse(response);
      return response.json();
    });
  }

  function rejectResponse(response) {
    return readError(response).then(function (detail) {
      var error = new Error(detail);
      error.status = response.status;
      throw error;
    });
  }

  function readError(response) {
    return response
      .json()
      .then(function (body) {
        return body.message || body.error || body.hint || body.details || response.statusText;
      })
      .catch(function () {
        return response.statusText || "Request failed";
      });
  }

  function apiUrl(pathAndQuery) {
    return settings.supabaseUrl.replace(/\/+$/, "") + "/rest/v1/" + pathAndQuery;
  }

  function apiHeaders(extra) {
    var headers = {
      apikey: settings.supabaseKey,
      Accept: "application/json",
    };
    if (settings.supabaseKey.indexOf("eyJ") === 0) {
      headers.Authorization = "Bearer " + settings.supabaseKey;
    }
    Object.keys(extra || {}).forEach(function (key) {
      headers[key] = extra[key];
    });
    return headers;
  }

  function describe(error, action) {
    var status = error && error.status;
    var raw = (error && error.message) || "";
    var message;
    if (error && error.name === "TypeError") {
      message = "Couldn't reach Supabase. Check the project URL and your connection.";
    } else if (status === 401 || /invalid api key|invalid jwt|JWSError/i.test(raw)) {
      message = "Supabase rejected the key in config.js. Use the publishable key.";
    } else if (status === 404 || /does not exist|schema cache|PGRST205/i.test(raw)) {
      message = "The dishes table is missing. Run supabase/schema.sql in the Supabase SQL editor.";
    } else if (/row-level security|permission denied|42501/i.test(raw)) {
      message = "Supabase refused the request. Run supabase/schema.sql so the read and add policies exist.";
    } else if (/check constraint|dishes_/i.test(raw)) {
      message = "That entry didn't fit the menu limits. Shorten it and try again.";
    } else if (action === "save") {
      message = "Couldn't save that dish.";
    } else {
      message = "Couldn't load the menu.";
    }
    return status ? message + " (" + status + ")" : message;
  }

  function renderMenu(dishes, highlightId) {
    if (dishes.length === 0) {
      showMenuMessage("Nothing on the menu yet. Add the first dish.", { loaded: true });
      return;
    }

    var known = {};
    CATEGORIES.forEach(function (entry) {
      known[entry[0]] = entry[1];
    });
    var extras = [];
    dishes.forEach(function (dish) {
      if (!known[dish.category] && extras.indexOf(dish.category) === -1) extras.push(dish.category);
    });
    var groups = CATEGORIES.concat(
      extras.map(function (value) {
        return [value, value || "Other"];
      })
    );

    summary.hidden = false;
    summary.textContent = summaryText(dishes);
    menu.replaceChildren();

    groups.forEach(function (entry) {
      var items = dishes.filter(function (dish) {
        return dish.category === entry[0];
      });
      if (items.length === 0) return;

      var group = document.createElement("section");
      group.className = "group";
      var heading = document.createElement("h3");
      heading.textContent = entry[1];
      var count = document.createElement("span");
      count.className = "count";
      count.textContent = String(items.length);
      heading.appendChild(document.createTextNode(" "));
      heading.appendChild(count);
      group.appendChild(heading);

      items.forEach(function (dish) {
        group.appendChild(renderDish(dish, highlightId));
      });
      menu.appendChild(group);
    });

    menu.dataset.loaded = "true";
  }

  function renderDish(dish, highlightId) {
    var card = document.createElement("article");
    card.className = "dish-card";
    if (highlightId && String(dish.id) === String(highlightId)) card.classList.add("is-new");

    var row = document.createElement("div");
    row.className = "dish-row";
    var name = document.createElement("p");
    name.className = "dish-name";
    name.textContent = String(dish.dish || "Untitled");
    row.appendChild(name);

    var when = formatWhen(dish.created_at);
    if (when) {
      var time = document.createElement("time");
      time.dateTime = dish.created_at || "";
      time.textContent = when;
      row.appendChild(time);
    }

    var guest = document.createElement("p");
    guest.className = "guest";
    guest.textContent = String(dish.guest_name || "Someone");

    card.appendChild(row);
    card.appendChild(guest);
    if (clean(dish.notes || "")) {
      var notes = document.createElement("p");
      notes.className = "notes";
      notes.textContent = clean(dish.notes);
      card.appendChild(notes);
    }
    return card;
  }

  function summaryText(dishes) {
    var people = {};
    dishes.forEach(function (dish) {
      var key = clean(dish.guest_name || "").toLowerCase();
      if (key) people[key] = true;
    });
    var peopleCount = Object.keys(people).length;
    return (
      dishes.length +
      (dishes.length === 1 ? " dish from " : " dishes from ") +
      peopleCount +
      (peopleCount === 1 ? " person" : " people")
    );
  }

  function showMenuMessage(text, options) {
    summary.hidden = true;
    summary.textContent = "";
    menu.replaceChildren();
    var paragraph = document.createElement("p");
    paragraph.className = "empty";
    paragraph.textContent = text;
    menu.appendChild(paragraph);
    if (options && options.loaded) menu.dataset.loaded = "true";
    else delete menu.dataset.loaded;
  }

  function categoryLabel(value) {
    for (var i = 0; i < CATEGORIES.length; i += 1) {
      if (CATEGORIES[i][0] === value) return CATEGORIES[i][1];
    }
    return "";
  }

  function formatWhen(iso) {
    var then = new Date(iso);
    if (Number.isNaN(then.getTime())) return "";
    var seconds = Math.round((Date.now() - then.getTime()) / 1000);
    if (seconds < 60) return "just now";
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + " min ago";
    var hours = Math.floor(minutes / 60);
    if (hours < 36) return hours + " hr ago";
    return then.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function clean(value) {
    return String(value || "")
      .replace(/[ \t\r\n]+/g, " ")
      .trim();
  }

  function setFormStatus(message, kind) {
    formStatus.textContent = message;
    formStatus.classList.toggle("ok", kind === "ok");
    formStatus.classList.toggle("err", kind === "err");
  }

  function setNote(el, message) {
    if (el.textContent !== message) el.textContent = message;
  }
})();

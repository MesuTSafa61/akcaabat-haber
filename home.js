(function () {
    "use strict";

    const FALLBACK_IMAGE =
        "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=78";
    const CATEGORY_PRIORITY = ["Akçaabat", "Trabzon", "Trabzonspor"];
    const state = { news: [], headlines: [], headlineIndex: 0, timer: null };

    function curatedNews() {
        return Array.isArray(window.AKCAABAT_CURRENT_NEWS)
            ? window.AKCAABAT_CURRENT_NEWS.map(normalize)
            : [];
    }

    function mergeNews(items) {
        const seen = new Set();
        return curatedNews().concat(Array.isArray(items) ? items : [])
            .filter(function (item) {
                const slug = String(item && item.slug || "").toLowerCase();
                if (!slug || slug.indexOf("demo-") === 0 || seen.has(slug)) return false;
                seen.add(slug);
                return true;
            })
            .sort(function (a, b) {
                return new Date(b.published_at || 0) - new Date(a.published_at || 0);
            });
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function categoryName(item) {
        if (item && item.categories && item.categories.name) {
            return item.categories.name;
        }
        return item.category || "Gündem";
    }

    function newsUrl(item) {
        if (!item) return "haber.html";
        if (item.slug) return "haber-detay.html?slug=" + encodeURIComponent(item.slug);
        return "haber-detay.html?id=" + encodeURIComponent(item.id || "");
    }

    function imageUrl(item) {
        return (item && (item.image_url || item.image)) || FALLBACK_IMAGE;
    }

    function publishedDate(item) {
        const raw = item && (item.published_at || item.publishedAt || item.created_at);
        const date = raw ? new Date(raw) : new Date();
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    }

    function publishedTime(item) {
        const raw = item && (item.published_at || item.publishedAt || item.created_at);
        const date = raw ? new Date(raw) : null;
        if (!date || Number.isNaN(date.getTime())) return "";
        return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    }

    function normalize(row) {
        return {
            id: row.id || "",
            title: row.title || "Başlıksız haber",
            slug: row.slug || "",
            summary: row.summary || "",
            image_url: row.image_url || row.image || FALLBACK_IMAGE,
            status: row.status || "published",
            is_breaking: row.is_breaking === true || row.breaking === true,
            is_headline: row.is_headline === true || row.isHeadline === true,
            headline_order: Number(row.headline_order || row.headlineOrder) || null,
            views: Number(row.views) || 0,
            published_at: row.published_at || row.publishedAt || row.created_at || "",
            created_at: row.created_at || row.createdAt || "",
            categories: row.categories || { name: row.category || "Gündem", slug: "" }
        };
    }

    function localNews() {
        try {
            const parsed = JSON.parse(localStorage.getItem("akcaabat_haberler") || "[]");
            return Array.isArray(parsed) ? mergeNews(parsed.map(normalize)).filter(function (item) {
                return item.status === "published";
            }) : [];
        } catch (_) {
            return [];
        }
    }

    async function cloudNews() {
        if (!window.supabase || !window.AKCAABAT_SUPABASE) return [];
        const client = window.supabase.createClient(
            window.AKCAABAT_SUPABASE.url,
            window.AKCAABAT_SUPABASE.key
        );
        const fullSelect = "id,title,slug,summary,image_url,status,is_breaking,is_headline,headline_order,views,published_at,created_at,categories(id,name,slug)";
        let result = await client.from("news").select(fullSelect)
            .eq("status", "published")
            .order("published_at", { ascending: false, nullsFirst: false })
            .limit(120);

        if (result.error && /is_headline|headline_order/i.test(result.error.message || "")) {
            result = await client.from("news")
                .select("id,title,slug,summary,image_url,status,is_breaking,views,published_at,created_at,categories(id,name,slug)")
                .eq("status", "published")
                .order("published_at", { ascending: false, nullsFirst: false })
                .limit(120);
        }
        if (result.error) throw result.error;
        return mergeNews((result.data || []).map(normalize));
    }

    function sortPriority(items) {
        return items.slice().sort(function (a, b) {
            const ai = CATEGORY_PRIORITY.indexOf(categoryName(a));
            const bi = CATEGORY_PRIORITY.indexOf(categoryName(b));
            const ar = ai === -1 ? 99 : ai;
            const br = bi === -1 ? 99 : bi;
            if (ar !== br) return ar - br;
            return new Date(b.published_at || 0) - new Date(a.published_at || 0);
        });
    }

    function openItem(item) {
        window.location.href = newsUrl(item);
    }

    function showHeadline(nextIndex, moveNumberStrip) {
        if (!state.headlines.length) return;
        state.headlineIndex = (nextIndex + state.headlines.length) % state.headlines.length;
        const item = state.headlines[state.headlineIndex];
        const image = document.getElementById("heroImage");
        if (image) { image.src = imageUrl(item); image.alt = item.title; }
        const values = {
            heroTitle: item.title,
            heroSummary: item.summary,
            heroDate: publishedDate(item),
            headlineCounter: (state.headlineIndex + 1) + "/" + state.headlines.length
        };
        Object.keys(values).forEach(function (id) {
            const element = document.getElementById(id);
            if (element) element.textContent = values[id];
        });
        const breaking = document.getElementById("heroBreaking");
        if (breaking) breaking.hidden = !item.is_breaking;
        const hero = document.getElementById("heroNews");
        if (hero) hero.onclick = function () { openItem(item); };
        const tabs = document.querySelectorAll(".headline-tab");
        tabs.forEach(function (tab, index) {
            tab.classList.toggle("is-active", index === state.headlineIndex);
            tab.setAttribute("aria-selected", index === state.headlineIndex ? "true" : "false");
            tab.setAttribute("aria-current", index === state.headlineIndex ? "true" : "false");
        });
        if (moveNumberStrip && tabs[state.headlineIndex]) {
            const track = document.getElementById("headlineTrack");
            const active = tabs[state.headlineIndex];
            if (track && track.scrollWidth > track.clientWidth) {
                track.scrollTo({ left: Math.max(0, active.offsetLeft - 12), behavior: "smooth" });
            }
        }
    }

    function restartHeadlineTimer() {
        if (state.timer) clearInterval(state.timer);
        if (state.headlines.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            state.timer = setInterval(function () { showHeadline(state.headlineIndex + 1, false); }, 5000);
        }
    }

    function renderHeadlines() {
        const eligibleHeadlines = state.news.filter(function (item) {
            return item.status === "published" && item.is_headline === true &&
                item.headline_order >= 1 && item.headline_order <= 10;
        });
        const adminHeadlines = eligibleHeadlines.filter(function (item) {
            return String(item.id || "").indexOf("curated-") !== 0;
        });
        state.headlines = (adminHeadlines.length ? adminHeadlines : eligibleHeadlines)
            .sort(function (a, b) { return a.headline_order - b.headline_order; })
            .slice(0, 10);

        const hero = document.getElementById("heroSection");
        const deck = document.querySelector(".headline-deck");
        const track = document.getElementById("headlineTrack");
        if (!state.headlines.length) {
            if (hero) hero.hidden = true;
            if (deck) deck.hidden = true;
            return;
        }
        if (hero) hero.hidden = false;
        if (deck) deck.hidden = false;
        if (track) {
            track.innerHTML = state.headlines.map(function (item, index) {
                return '<button class="headline-tab" type="button" aria-current="' +
                    (index === 0 ? "true" : "false") + '" data-index="' + index +
                    '" aria-label="' + escapeHtml((index + 1) + '. manşet: ' + item.title) + '"></button>';
            }).join("");
            track.querySelectorAll(".headline-tab").forEach(function (tab) {
                tab.addEventListener("click", function () {
                    showHeadline(Number(tab.dataset.index), true);
                    restartHeadlineTimer();
                });
            });
        }
        const prev = document.getElementById("headlinePrev");
        const next = document.getElementById("headlineNext");
        if (prev) prev.onclick = function (event) {
            event.stopPropagation();
            showHeadline(state.headlineIndex - 1, true);
            restartHeadlineTimer();
        };
        if (next) next.onclick = function (event) {
            event.stopPropagation();
            showHeadline(state.headlineIndex + 1, true);
            restartHeadlineTimer();
        };
        addHeadlineSwipe();
        showHeadline(0, false);
        restartHeadlineTimer();
    }

    function addHeadlineSwipe() {
        const hero = document.getElementById("heroNews");
        if (!hero || hero.dataset.swipeReady) return;
        hero.dataset.swipeReady = "true";
        let startX = 0;
        hero.addEventListener("touchstart", function (event) {
            startX = event.changedTouches[0].clientX;
        }, { passive: true });
        hero.addEventListener("touchend", function (event) {
            const diff = event.changedTouches[0].clientX - startX;
            if (Math.abs(diff) < 45) return;
            showHeadline(state.headlineIndex + (diff < 0 ? 1 : -1), true);
            restartHeadlineTimer();
        }, { passive: true });
    }

    function renderBreaking() {
        const bar = document.querySelector(".breaking-bar");
        const target = document.getElementById("breakingContent");
        const items = state.news.filter(function (item) { return item.is_breaking; }).slice(0, 4);
        if (!items.length) { if (bar) bar.hidden = true; return; }
        if (bar) bar.hidden = false;
        if (target) target.innerHTML = items.map(function (item) {
            return '<a href="' + escapeHtml(newsUrl(item)) + '"><time>' + escapeHtml(publishedTime(item)) +
                '</time> ' + escapeHtml(item.title) + '</a>';
        }).join('<span class="breaking-separator">•</span>');
    }

    function renderSideNews() {
        const target = document.getElementById("heroSideNews");
        if (!target) return;
        const headlineIds = new Set(state.headlines.map(function (item) { return item.id; }));
        const items = sortPriority(state.news.filter(function (item) { return !headlineIds.has(item.id); })).slice(0, 3);
        target.innerHTML = items.map(function (item) {
            return '<article class="side-news" data-url="' + escapeHtml(newsUrl(item)) + '">' +
                '<div class="side-news-image"><img src="' + escapeHtml(imageUrl(item)) + '" alt="' +
                escapeHtml(item.title) + '" loading="lazy"><span>' + escapeHtml(categoryName(item).toUpperCase()) +
                '</span></div><div class="side-news-content"><small>' + escapeHtml(publishedTime(item)) +
                '</small><h3>' + escapeHtml(item.title) + '</h3></div></article>';
        }).join("");
        target.querySelectorAll("[data-url]").forEach(function (card) {
            card.onclick = function () { window.location.href = card.dataset.url; };
        });
    }

    function cardHtml(item) {
        return '<article class="news-card" data-url="' + escapeHtml(newsUrl(item)) + '">' +
            '<div class="news-card-image"><img src="' + escapeHtml(imageUrl(item)) + '" alt="' +
            escapeHtml(item.title) + '" loading="lazy" width="520" height="300"><span class="news-card-category">' +
            escapeHtml(categoryName(item).toUpperCase()) + '</span></div><div class="news-card-body"><div class="news-card-meta">' +
            escapeHtml(publishedDate(item)) + '</div><h3>' + escapeHtml(item.title) + '</h3><p>' +
            escapeHtml(item.summary) + '</p></div></article>';
    }

    function renderNewsGrid() {
        const target = document.getElementById("newsGrid");
        if (!target) return;
        const items = sortPriority(state.news).slice(0, 10);
        target.innerHTML = items.length ? items.map(cardHtml).join("") : '<div class="empty-inline">Yayınlanmış haber bulunmuyor.</div>';
        target.querySelectorAll("[data-url]").forEach(function (card) {
            card.onclick = function () { window.location.href = card.dataset.url; };
        });
    }

    function renderPopular() {
        const target = document.getElementById("popularNews");
        if (!target) return;
        const items = state.news.filter(function (item) { return item.views > 0; })
            .sort(function (a, b) { return b.views - a.views; }).slice(0, 5);
        target.innerHTML = items.length ? items.map(function (item, index) {
            return '<article class="popular-item" data-url="' + escapeHtml(newsUrl(item)) + '"><span class="popular-number">' +
                String(index + 1).padStart(2, "0") + '</span><div><small>' + escapeHtml(categoryName(item).toUpperCase()) +
                '</small><h3>' + escapeHtml(item.title) + '</h3></div></article>';
        }).join("") : '<div class="empty-inline">Okunma verisi oluştuğunda liste burada yayınlanır.</div>';
        target.querySelectorAll("[data-url]").forEach(function (item) {
            item.onclick = function () { window.location.href = item.dataset.url; };
        });
    }

    function categoryMatches(item, category) {
        const value = categoryName(item).toLocaleLowerCase("tr-TR");
        if (category === "Trabzonspor") return value === "trabzonspor" || value === "spor";
        return value === category.toLocaleLowerCase("tr-TR");
    }

    function renderCategorySections() {
        const target = document.getElementById("categorySections");
        if (!target) return;
        target.innerHTML = CATEGORY_PRIORITY.map(function (category) {
            const items = state.news.filter(function (item) { return categoryMatches(item, category); }).slice(0, 4);
            if (!items.length) return "";
            const cards = items.map(function (item) {
                return '<article class="category-story" data-url="' + escapeHtml(newsUrl(item)) + '"><img src="' +
                    escapeHtml(imageUrl(item)) + '" alt="' + escapeHtml(item.title) + '" loading="lazy"><div class="category-story-body"><small>' +
                    escapeHtml(category.toUpperCase()) + '</small><h3>' + escapeHtml(item.title) + '</h3><time>' +
                    escapeHtml(publishedTime(item)) + '</time></div></article>';
            }).join("");
            return '<section class="category-news-section"><div class="category-news-head"><h2>' + escapeHtml(category) +
                '</h2><a href="kategori.html?kategori=' + encodeURIComponent(category === "Trabzonspor" ? "Spor" : category) +
                '">Tüm Haberler →</a></div><div class="category-news-grid">' + cards + '</div></section>';
        }).join("");
        target.querySelectorAll("[data-url]").forEach(function (card) {
            card.onclick = function () { window.location.href = card.dataset.url; };
        });
    }

    function renderAll(news) {
        state.news = mergeNews(news).filter(function (item) { return item.status === "published"; });
        renderHeadlines();
        renderBreaking();
        renderSideNews();
        renderNewsGrid();
        renderPopular();
        renderCategorySections();
    }

    function initControls() {
        const menuButton = document.getElementById("mobileMenuButton");
        const nav = document.getElementById("mainNav");
        if (menuButton && nav) {
            menuButton.onclick = function () {
                const open = nav.classList.toggle("mobile-open");
                menuButton.setAttribute("aria-expanded", open ? "true" : "false");
            };
        }
        const searchButton = document.getElementById("headerSearchButton");
        const searchPanel = document.getElementById("searchPanel");
        if (searchButton && searchPanel) {
            searchButton.onclick = function () { searchPanel.classList.toggle("search-open"); };
        }
    }

    async function init() {
        initControls();
        if ("serviceWorker" in navigator && window.isSecureContext) {
            navigator.serviceWorker.register("sw.js").catch(function (error) {
                console.warn("Çevrimdışı destek başlatılamadı:", error);
            });
        }
        const cached = localNews();
        if (cached.length) renderAll(cached);
        try {
            const fresh = await cloudNews();
            if (fresh.length) {
                renderAll(fresh);
                try { localStorage.setItem("akcaabat_haberler", JSON.stringify(fresh)); } catch (_) {}
            } else if (!cached.length) {
                renderAll(curatedNews());
            }
        } catch (error) {
            console.error("Ana sayfa haberleri yüklenemedi:", error);
            if (!cached.length) renderAll(curatedNews());
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();

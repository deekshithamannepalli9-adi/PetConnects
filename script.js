/* =========================================================
   PetHaven — Enhanced JavaScript
   Breed-aware images, combined filters, sorting, favorites,
   adoption workflow, validation and resilient fallbacks.
========================================================= */

"use strict";

let selectedPetName = "";
let selectedPetCard = null;

/* Images are deliberately static and breed-specific.
   This avoids random API images being assigned to the wrong pet and
   keeps the website stable when opened directly from a local VS Code folder. */

const FAVORITES_KEY = "pethaven-favorites";

document.addEventListener("DOMContentLoaded", () => {
    initialiseImages();
    restoreFavorites();
    applyFilters();
    setupModalAccessibility();
});

/* =========================================================
   IMAGE LOADING
========================================================= */

function makeImageFallback(image) {
    const breed = image.dataset.breed || 'Pet';
    const emojiMap = {
        'St. Bernard': '🐶', 'German Shepherd': '🐕', 'Golden Retriever': '🦮',
        'Labrador Retriever': '🐕', 'Siberian Husky': '🐺', 'Standard Poodle': '🐩',
        'Beagle': '🐶', 'Persian Cat': '🐱', 'Siamese Cat': '🐈', 'Maine Coon': '🐈',
        'Rose-ringed Parakeet (Indian Ringneck)': '🦜', 'Cockatiel': '🦜',
        'Ocellaris Clownfish': '🐠', 'Goldfish': '🐟', 'Holland Lop Rabbit': '🐰',
        'Syrian Hamster': '🐹', 'Red-Eared Slider': '🐢'
    };
    const emoji = emojiMap[breed] || '🐾';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600" viewBox="0 0 900 600">
        <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#fff3ed"/><stop offset="1" stop-color="#ffe1d2"/></linearGradient></defs>
        <rect width="900" height="600" fill="url(#g)"/>
        <text x="450" y="280" text-anchor="middle" font-size="150">${emoji}</text>
        <text x="450" y="400" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" font-weight="700" fill="#263238">${breed}</text>
        <text x="450" y="455" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" fill="#68737a">PetHaven</text>
    </svg>`;
    image.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    image.classList.add('fallback-image');
}

function initialiseImages() {
    const images = document.querySelectorAll('.pet-image img');

    images.forEach(image => {
        const box = image.closest('.pet-image');
        if (!box) return;

        box.classList.add('loading');
        let fallbackTried = false;

        image.addEventListener('load', () => {
            box.classList.remove('loading');
            image.classList.remove('image-loading', 'image-error');
            image.classList.add('image-loaded');
        });

        image.addEventListener('error', () => {
            if (!fallbackTried && image.dataset.fallback) {
                fallbackTried = true;
                image.src = image.dataset.fallback;
                return;
            }

            box.classList.remove('loading');
            image.classList.remove('image-loading');
            image.classList.add('image-error');
            makeImageFallback(image);
        });

        image.classList.add('image-loading');
    });
}

/* =========================================================
   SEARCH + SPECIES + GENDER FILTERING
========================================================= */

function normalise(value) {
    return String(value || "").trim().toLowerCase();
}

function applyFilters() {
    const search = normalise(document.getElementById("searchInput").value);
    const species = document.getElementById("speciesFilter").value;
    const gender = document.getElementById("genderFilter").value;

    const cards = Array.from(document.querySelectorAll(".pet-card"));
    let visibleCount = 0;

    cards.forEach(card => {
        const name = normalise(card.dataset.name);
        const breed = normalise(card.dataset.breed);
        const cardSpecies = card.dataset.species;
        const cardGender = card.dataset.gender;

        const searchMatch =
            !search ||
            name.includes(search) ||
            breed.includes(search);

        const speciesMatch =
            species === "all" ||
            cardSpecies === species;

        const genderMatch =
            gender === "all" ||
            cardGender === gender;

        const visible = searchMatch && speciesMatch && genderMatch;

        card.style.display = visible ? "" : "none";

        if (visible) visibleCount++;
    });

    updateCategoryButtons(species);
    updateResultCount(visibleCount, cards.length);

    const noResults = document.getElementById("noResults");
    if (noResults) {
        noResults.hidden = visibleCount !== 0;
    }
}

function filterPets() {
    applyFilters();
}

function categoryFilter(category, button) {
    document.getElementById("speciesFilter").value = category;

    document.querySelectorAll(".category-btn").forEach(btn => {
        btn.classList.remove("active");
    });

    if (button) {
        button.classList.add("active");
    }

    applyFilters();
}

function updateCategoryButtons(species) {
    document.querySelectorAll(".category-btn").forEach(btn => {
        const match = btn.getAttribute("onclick")?.match(/categoryFilter\('([^']+)'/);
        btn.classList.toggle("active", Boolean(match && match[1] === species));
    });
}

function updateResultCount(visible, total) {
    let counter = document.getElementById("filterCount");

    if (!counter) {
        counter = document.createElement("p");
        counter.id = "filterCount";
        counter.className = "filter-count";

        const categories = document.querySelector(".categories");
        categories?.insertAdjacentElement("afterend", counter);
    }

    counter.textContent =
        `${visible} of ${total} pets shown`;
}

/* =========================================================
   SORTING
========================================================= */

function sortPets() {
    const sort = document.getElementById("sortFilter").value;
    const grid = document.getElementById("petGrid");

    const cards = Array.from(grid.querySelectorAll(".pet-card"));

    if (sort === "low") {
        cards.sort((a, b) =>
            Number(a.dataset.fee) - Number(b.dataset.fee)
        );
    } else if (sort === "high") {
        cards.sort((a, b) =>
            Number(b.dataset.fee) - Number(a.dataset.fee)
        );
    } else {
        // Restore the original HTML order.
        cards.sort((a, b) =>
            Number(a.dataset.originalIndex) -
            Number(b.dataset.originalIndex)
        );
    }

    cards.forEach(card => grid.appendChild(card));

    applyFilters();
}

/* =========================================================
   RESET
========================================================= */

function resetFilters() {
    document.getElementById("searchInput").value = "";
    document.getElementById("speciesFilter").value = "all";
    document.getElementById("genderFilter").value = "all";
    document.getElementById("sortFilter").value = "default";

    const grid = document.getElementById("petGrid");
    const cards = Array.from(grid.querySelectorAll(".pet-card"));

    cards
        .sort((a, b) =>
            Number(a.dataset.originalIndex) -
            Number(b.dataset.originalIndex)
        )
        .forEach(card => grid.appendChild(card));

    applyFilters();
}

/* =========================================================
   PET DETAILS
========================================================= */

function getTypeLabel(species) {
    return ["dog", "cat", "rabbit"].includes(species)
        ? "Breed"
        : "Species";
}

function showDetails(
    name,
    breed,
    age,
    gender,
    location,
    fee,
    description
) {
    const card = Array.from(document.querySelectorAll(".pet-card"))
        .find(item => item.dataset.name === name && item.dataset.breed === breed);

    const species = card?.dataset.species || "";
    const typeLabel = getTypeLabel(species);

    document.getElementById("detailsName").innerText =
        `${name} — Pet Profile`;

    document.getElementById("detailsContent").innerHTML = `
        <strong>${typeLabel}:</strong> ${escapeHtml(breed)}<br><br>
        <strong>Age:</strong> ${escapeHtml(age)}<br><br>
        <strong>Gender:</strong> ${escapeHtml(gender)}<br><br>
        <strong>Location:</strong> ${escapeHtml(location)}<br><br>
        <strong>Adoption Fee:</strong> ${escapeHtml(fee)}<br><br>
        <strong>About:</strong> ${escapeHtml(description)}
    `;

    document.getElementById("detailsModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
}

/* =========================================================
   ADOPTION APPLICATION
========================================================= */

function openAdoptionForm(petName) {
    selectedPetName = petName;

    selectedPetCard = Array.from(document.querySelectorAll(".pet-card"))
        .find(card => card.dataset.name === petName);

    document.getElementById("selectedPet").innerText = petName;
    document.getElementById("adoptionModal").style.display = "flex";
    document.body.style.overflow = "hidden";

    setTimeout(() => {
        document.getElementById("applicantName")?.focus();
    }, 50);
}

function submitApplication(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const applicantName =
        document.getElementById("applicantName").value.trim();

    document.getElementById("confirmedPet").innerText = selectedPetName;
    document.getElementById("confirmedApplicant").innerText = applicantName;

    document.getElementById("adoptionModal").style.display = "none";
    document.getElementById("confirmationPage").style.display = "flex";
    document.body.style.overflow = "hidden";

    form.reset();
}

/* =========================================================
   MODALS
========================================================= */

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;

    modal.style.display = "none";

    const detailsOpen =
        document.getElementById("detailsModal").style.display === "flex";

    const adoptionOpen =
        document.getElementById("adoptionModal").style.display === "flex";

    if (!detailsOpen && !adoptionOpen) {
        document.body.style.overflow = "auto";
    }
}

function setupModalAccessibility() {
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal("detailsModal");
            closeModal("adoptionModal");
        }
    });
}

window.addEventListener("click", event => {
    const detailsModal = document.getElementById("detailsModal");
    const adoptionModal = document.getElementById("adoptionModal");

    if (event.target === detailsModal) {
        closeModal("detailsModal");
    }

    if (event.target === adoptionModal) {
        closeModal("adoptionModal");
    }
});

/* =========================================================
   FAVORITES — PERSISTED WITH LOCAL STORAGE
========================================================= */

function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    } catch {
        return [];
    }
}

function saveFavorites(favorites) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function restoreFavorites() {
    const favorites = getFavorites();

    document.querySelectorAll(".pet-card").forEach(card => {
        if (!favorites.includes(card.dataset.name)) return;

        const button = card.querySelector(".favorite");
        if (!button) return;

        button.classList.add("liked");
        button.innerText = "♥";
        button.setAttribute("aria-pressed", "true");
    });
}

function favoritePet(event, petName) {
    event.stopPropagation();

    const button = event.currentTarget;
    const favorites = getFavorites();
    const index = favorites.indexOf(petName);

    if (index === -1) {
        favorites.push(petName);
        button.classList.add("liked");
        button.innerText = "♥";
        button.setAttribute("aria-pressed", "true");
    } else {
        favorites.splice(index, 1);
        button.classList.remove("liked");
        button.innerText = "♡";
        button.setAttribute("aria-pressed", "false");
    }

    saveFavorites(favorites);
}

/* =========================================================
   RETURN HOME
========================================================= */

function returnHome() {
    document.getElementById("confirmationPage").style.display = "none";
    document.body.style.overflow = "auto";

    document.getElementById("home").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

/* =========================================================
   INITIAL CARD ORDER
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".pet-card").forEach((card, index) => {
        card.dataset.originalIndex = index;
    });
});

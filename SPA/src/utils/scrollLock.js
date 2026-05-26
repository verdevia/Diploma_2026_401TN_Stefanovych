let lockCount = 0;
let touchStartY = 0;

const scrollKeys = new Set([
    "ArrowDown",
    "ArrowUp",
    "End",
    "Home",
    "PageDown",
    "PageUp",
    " ",
]);

function isEditableTarget(target) {
    return target instanceof HTMLElement
        && (
            target.isContentEditable
            || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)
        );
}

function canScrollElement(element, deltaY) {
    if (!(element instanceof HTMLElement) || element.scrollHeight <= element.clientHeight + 1) {
        return false;
    }

    if (deltaY < 0) {
        return element.scrollTop > 0;
    }

    if (deltaY > 0) {
        return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
    }

    return true;
}

function canScrollInsideModal(target, deltaY) {
    if (!(target instanceof Element)) {
        return false;
    }

    const modal = target.closest(".modal-window");
    if (!modal) {
        return false;
    }

    let element = target;
    while (element && element instanceof HTMLElement) {
        if (canScrollElement(element, deltaY)) {
            return true;
        }

        if (element === modal) {
            break;
        }

        element = element.parentElement;
    }

    return false;
}

function preventPageWheel(event) {
    if (event.ctrlKey) {
        return;
    }

    if (!canScrollInsideModal(event.target, event.deltaY)) {
        event.preventDefault();
    }
}

function rememberTouchStart(event) {
    if (event.touches.length === 1) {
        touchStartY = event.touches[0].clientY;
    }
}

function preventPageTouchMove(event) {
    if (event.touches.length !== 1) {
        return;
    }

    const currentY = event.touches[0].clientY;
    const deltaY = touchStartY - currentY;
    touchStartY = currentY;

    if (!canScrollInsideModal(event.target, deltaY)) {
        event.preventDefault();
    }
}

function preventPageKeyScroll(event) {
    if (!scrollKeys.has(event.key) || isEditableTarget(event.target)) {
        return;
    }

    const deltaY = ["ArrowUp", "Home", "PageUp"].includes(event.key) ? -1 : 1;
    if (!canScrollInsideModal(event.target, deltaY)) {
        event.preventDefault();
    }
}

function addListeners() {
    document.addEventListener("wheel", preventPageWheel, { capture: true, passive: false });
    document.addEventListener("touchstart", rememberTouchStart, { capture: true, passive: true });
    document.addEventListener("touchmove", preventPageTouchMove, { capture: true, passive: false });
    document.addEventListener("keydown", preventPageKeyScroll, { capture: true });
}

function removeListeners() {
    document.removeEventListener("wheel", preventPageWheel, true);
    document.removeEventListener("touchstart", rememberTouchStart, true);
    document.removeEventListener("touchmove", preventPageTouchMove, true);
    document.removeEventListener("keydown", preventPageKeyScroll, true);
}

export function lockPageScroll() {
    lockCount += 1;

    if (lockCount === 1) {
        addListeners();
    }

    return () => {
        lockCount = Math.max(0, lockCount - 1);

        if (lockCount === 0) {
            removeListeners();
        }
    };
}

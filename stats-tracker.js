(() => {
    // Each open timer writes its own ledger, avoiding cross-tab overwrites.
    const key = "meloFocusHistory:" + crypto.randomUUID();
    const days = {};
    let marker = null, deadline = null, completed = true;
    const dayKey = time => {
        const date = new Date(time);
        return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    };
    const entry = time => days[dayKey(time)] ||= {milliseconds: 0, sessions: 0};
    function save() {
        if (!Object.keys(days).length) return;
        try { localStorage.setItem(key, JSON.stringify(days)); }
        catch { document.getElementById("historyNotice")?.removeAttribute("hidden"); }
    }
    function checkpoint() {
        if (marker === null) return;
        const until = Math.min(Date.now(), deadline);
        while (marker < until) {
            const midnight = new Date(marker);
            midnight.setHours(24,0,0,0);
            const stop = Math.min(until, midnight.getTime());
            entry(marker).milliseconds += stop - marker;
            marker = stop;
        }
        save();
    }
    window.MeloStats = {
        start(end) { marker = Date.now(); deadline = end; completed = false; },
        stop() { checkpoint(); marker = null; },
        complete() {
            if (completed || deadline === null) return;
            entry(deadline).sessions++;
            completed = true;
            save();
        },
        checkpoint
    };
    setInterval(checkpoint, 1000);
    document.addEventListener("visibilitychange", checkpoint);
    window.addEventListener("pagehide", checkpoint);
    window.addEventListener("pageshow", checkpoint);
})();
(() => {
    const dayKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
    function duration(ms) {
        const seconds = Math.floor(ms / 1000), minutes = Math.floor(seconds / 60), hours = Math.floor(minutes / 60);
        return hours ? `${hours}h ${minutes % 60}m ${seconds % 60}s` : `${minutes}m ${seconds % 60}s`;
    }
    function render() {
        const dates = Array.from({length:7}, (_, i) => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - 6 + i); return d; });
        const days = Object.fromEntries(dates.map(d => [dayKey(d), {milliseconds:0,sessions:0}]));
        let unavailable = false;
        try {
            for (let i=0; i<localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key.startsWith("meloFocusHistory:")) continue;
                try {
                    const ledger = JSON.parse(localStorage.getItem(key));
                    for (const [day, value] of Object.entries(days)) {
                        const item = ledger?.[day];
                        if (!item) continue;
                        if (Number.isFinite(item.milliseconds) && item.milliseconds >= 0) value.milliseconds += item.milliseconds;
                        if (Number.isSafeInteger(item.sessions) && item.sessions >= 0) value.sessions += item.sessions;
                    }
                } catch { /* Ignore a damaged record without hiding other history. */ }
            }
        } catch { unavailable = true; }
        const tbody = document.getElementById("dailyStats"); tbody.replaceChildren();
        let totalMs=0, totalSessions=0;
        dates.forEach(date => {
            const day = days[dayKey(date)]; totalMs += day.milliseconds; totalSessions += day.sessions;
            const row = document.createElement("tr");
            for (const value of [date.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"}),duration(day.milliseconds),day.sessions]) {
                const cell = document.createElement("td"); cell.textContent = value; row.appendChild(cell);
            }
            tbody.appendChild(row);
        });
        document.getElementById("totalFocus").textContent = duration(totalMs);
        document.getElementById("totalSessions").textContent = totalSessions;
        document.getElementById("weekRange").textContent = dates[0].toLocaleDateString() + " – " + dates[6].toLocaleDateString();
        document.getElementById("statsMessage").textContent = unavailable ? "Browser storage is unavailable; stats cannot be read." : totalMs ? "Updates while you focus." : "No focus time recorded this week yet.";
    }
    render(); setInterval(render, 5000);
    window.addEventListener("storage", render);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
})();
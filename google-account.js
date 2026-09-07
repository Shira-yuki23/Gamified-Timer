(() => {
    const button = document.getElementById('googleSignIn');
    const logout = document.getElementById('googleSignOut');
    const label = document.getElementById('accountName');
    const status = document.getElementById('syncStatus');
    const retry = document.getElementById('syncRetry');
    const conflictBox = document.getElementById('syncConflict');
    let user = null, auth, db, sdk, reference = null;
    let revision = 0, pending = null, generation = 0, busy = false, conflict = null;
    let loading = false, timer = null;
    const clone = value => JSON.parse(JSON.stringify(value));
    const draftKey = uid => 'melo-google-draft:' + uid;
    const message = text => { status.textContent = text; };
    function lock(value) {
        loading = value;
        document.querySelector('main').inert = value;
        window.meloAccountBusy = value;
    }
    function writeDraft() {
        if (!user) return;
        try {
            if (pending) sessionStorage.setItem(draftKey(user.uid), JSON.stringify({data: pending, revision}));
            else sessionStorage.removeItem(draftKey(user.uid));
        } catch { message('Could not keep an offline copy. Keep this tab open until saved.'); }
    }
    function showConflict(remote) {
        conflict = remote;
        conflictBox.hidden = false;
        retry.hidden = true;
        message('Another device has newer progress. Choose which copy to keep.');
    }
    function validRecord(value) {
        if (!value || !Number.isSafeInteger(value.revision) || value.revision < 0) throw Error('invalid-progress');
        return {revision: value.revision, data: window.meloProgress.validate(value.data)};
    }
    async function flush() {
        if (!user || !reference || !pending || busy || conflict || loading) return;
        busy = true;
        const epoch = generation, ref = reference, data = clone(pending), expected = revision;
        message('Saving…');
        retry.hidden = true;
        try {
            const nextRevision = await sdk.runTransaction(db, async tx => {
                const snapshot = await tx.get(ref);
                const remote = snapshot.exists() ? validRecord(snapshot.data()) : {revision: 0};
                if (remote.revision !== expected) throw Object.assign(Error('conflict'), {remote});
                tx.set(ref, {data, revision: expected + 1});
                return expected + 1;
            });
            if (epoch !== generation) return;
            revision = nextRevision;
            if (JSON.stringify(pending) === JSON.stringify(data)) pending = null;
            writeDraft();
            message(pending ? 'Saving…' : 'Saved to your Google account');
        } catch (failure) {
            if (epoch !== generation) return;
            if (failure.remote) showConflict(failure.remote);
            else {
                message('Not synced yet. Your changes are kept in this tab; retry when online.');
                retry.hidden = false;
            }
        } finally {
            if (epoch === generation) {
                busy = false;
                if (pending && !conflict && retry.hidden) timer = setTimeout(flush, 400);
            }
        }
    }
    window.meloSync = {
        save(data) {
            if (loading) return true;
            if (!user) return false;
            pending = clone(data);
            writeDraft();
            message(conflict ? 'Choose which progress to keep below.' : 'Waiting to sync…');
            clearTimeout(timer);
            timer = setTimeout(flush, 400);
            return true;
        }
    };
    async function refresh() {
        if (!user || !reference || loading || busy || conflict) return;
        if (pending) { await flush(); return; }
        const epoch = generation;
        busy = true;
        try {
            const snapshot = await sdk.getDocFromServer(reference);
            if (epoch !== generation || !snapshot.exists()) return;
            const remote = validRecord(snapshot.data());
            if (remote.revision > revision) {
                if (pending) showConflict(remote);
                else {
                    revision = remote.revision;
                    window.meloProgress.apply(remote.data, false);
                    message('Updated from your Google account');
                }
            }
        } catch { if (epoch === generation) message('Offline. Changes will sync when you reconnect.'); }
        finally { if (epoch === generation) { busy = false; if (pending && !conflict) flush(); } }
    }
    async function changed(nextUser) {
        const epoch = ++generation;
        clearTimeout(timer);
        window.meloProgress.stop();
        pending = null; conflict = null; busy = false; reference = null;
        conflictBox.hidden = true; retry.hidden = true;
        user = nextUser;
        button.hidden = Boolean(user); logout.hidden = !user;
        label.textContent = user ? (user.displayName || 'Your account') : 'Guest';
        if (!user) {
            window.meloProgress.loadGuest();
            lock(false);
            message('Saved on this browser');
            return;
        }
        lock(true);
        message('Loading your progress…');
        reference = sdk.doc(db, 'meloUsers', user.uid);
        const accountReference = reference;
        try {
            const snapshot = await sdk.getDocFromServer(accountReference);
            if (epoch !== generation) return;
            let remote = snapshot.exists() ? validRecord(snapshot.data()) : null;
            if (!remote) {
                const guest = window.meloProgress.guest();
                const hasGuest = guest.tasks.length || guest.breakBankMinutes || guest.sessionCount > 1;
                const data = hasGuest && window.confirm('Bring this browser’s guest tasks and progress into your Google account?')
                    ? guest : window.meloProgress.defaults();
                // A simultaneous first login on another device must not be overwritten.
                remote = await sdk.runTransaction(db, async tx => {
                    const current = await tx.get(accountReference);
                    if (current.exists()) return validRecord(current.data());
                    const initial = {data, revision: 0};
                    tx.set(accountReference, initial);
                    return initial;
                });
            }
            if (epoch !== generation) return;
            revision = remote.revision;
            let draft;
            try { draft = JSON.parse(sessionStorage.getItem(draftKey(user.uid))); } catch { /* No usable draft. */ }
            if (draft) {
                draft = validRecord(draft);
                pending = draft.data;
                window.meloProgress.apply(pending, true);
                if (draft.revision !== remote.revision) showConflict(remote);
            } else window.meloProgress.apply(remote.data, true);
            lock(false);
            if (!conflict) message('Saved to your Google account');
            if (pending && !conflict) flush();
        } catch {
            if (epoch !== generation) return;
            // Do not allow guest data to overwrite an account whose data failed to load.
            message('Could not load your account. Retry, or sign out to use Guest mode.');
            retry.hidden = false;
        }
    }
    retry.addEventListener('click', () => loading ? changed(auth.currentUser) : (pending ? flush() : refresh()));
    document.getElementById('useCloudProgress').addEventListener('click', () => {
        if (!conflict) return;
        if (!window.confirm('Replace this tab’s unsynced progress with the cloud copy?')) return;
        revision = conflict.revision;
        window.meloProgress.apply(conflict.data, false);
        pending = null; conflict = null;
        writeDraft(); conflictBox.hidden = true;
        message('Using saved cloud progress');
    });
    document.getElementById('keepLocalProgress').addEventListener('click', () => {
        if (!conflict) return;
        if (!window.confirm('Replace the cloud copy with this device’s progress?')) return;
        revision = conflict.revision; conflict = null;
        writeDraft(); conflictBox.hidden = true; flush();
    });
    logout.addEventListener('click', async () => {
        if (busy) { message('Please wait for the current sync to finish.'); return; }
        if (pending && !window.confirm('Some changes are not synced. Sign out and keep a draft in this tab for your next login?')) return;
        writeDraft();
        window.meloProgress.stop();
        try { await sdk.signOut(auth); } catch { message('Sign out failed. Please retry.'); }
    });
    window.addEventListener('beforeunload', event => {
        if (pending) { event.preventDefault(); event.returnValue = ''; }
    });
    window.addEventListener('online', () => pending ? flush() : refresh());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    const config = window.MELO_FIREBASE_CONFIG;
    if (!config?.apiKey || !config?.authDomain || !config?.projectId || !config?.appId) {
        button.disabled = true;
        message('Google sign-in is not connected yet · Guest mode works');
        return;
    }
    if (location.protocol === 'file:') {
        button.disabled = true;
        message('Open Melo through its website or local server to sign in');
        return;
    }
    button.disabled = true;
    lock(true);
    message('Connecting…');
    (async () => {
        const [appSDK, authSDK, storeSDK] = await Promise.all([
            import('https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js'),
            import('https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js')
        ]);
        sdk = {...authSDK, ...storeSDK};
        const app = appSDK.initializeApp(config);
        auth = sdk.getAuth(app); db = sdk.getFirestore(app);
        // Session persistence keeps account switching in separate tabs independent.
        await sdk.setPersistence(auth, sdk.browserSessionPersistence);
        button.disabled = false;
        button.addEventListener('click', async () => {
            window.meloProgress.stop();
            button.disabled = true;
            try {
                const provider = new sdk.GoogleAuthProvider();
                provider.setCustomParameters({prompt: 'select_account'});
                await sdk.signInWithPopup(auth, provider);
            } catch (failure) {
                const messages = {
                    'auth/popup-closed-by-user': 'Sign-in canceled. You can continue as Guest.',
                    'auth/popup-blocked': 'Allow the Google sign-in popup, then try again.',
                    'auth/unauthorized-domain': 'This website has not been enabled for Google sign-in yet.',
                    'auth/network-request-failed': 'Could not reach Google. Check your connection and retry.'
                };
                message(messages[failure.code] || 'Google sign-in failed. Please try again.');
            } finally { button.disabled = false; }
        });
        sdk.onAuthStateChanged(auth, changed, () => { lock(false); message('Could not restore sign-in. Please retry.'); });
        setInterval(refresh, 15000);
    })().catch(() => {
        lock(false);
        message('Google sign-in could not load. Refresh to retry; Guest mode works.');
    });
})();


(function () {
    // Shamelessly copied from the hn.js source
    function $(id) { return document.getElementById(id); }
    function remClass (el, cl) { if (el) { var a = el.className.split(' '); arem(a, cl); el.className = a.join(' ') } }
    function aeach (fn, a) { return Array.prototype.forEach.call(a, fn) }
    function elShow (el) { remClass(el, 'noshow') }
    function byClass (el, cl) { return el ? el.getElementsByClassName(cl) : [] }
    function vis(el, on) { if (el) { on ? remClass(el, 'nosee') : addClass(el, 'nosee') } }
    function comments () { return allof('comtr') }
    function collapsed () { return allof('coll') }
    function hasClass (el, cl) { var a = el.className.split(' '); return afind(cl, a) }
    function addClass (el, cl) { if (el) { var a = el.className.split(' '); if (!afind(cl, a)) { a.unshift(cl); el.className = a.join(' ')}} }
    function apos (x, a) { return (typeof x == 'function') ? posf(x,a) : Array.prototype.indexOf.call(a,x) }
    function acut (a, m, n) { return Array.prototype.slice.call(a, m, n) }
    function ind (el) { return (byTag(el, 'img')[0] || {}).width }
    function byTag (el, tg) { return el ? el.getElementsByTagName(tg) : [] }
    function allof (cl) { return byClass(document, cl) }
    function arem (a, x) { var i = apos(x, a); if (i >= 0) { a.splice(i, 1); } return a; }
    function afind (x, a) { var i = apos(x, a); return (i >= 0) ? a[i] : null; }
    function posf (f, a) { for (var i=0; i < a.length; i++) { if (f(a[i])) return i; } return -1; }
    function noshow (el) { addClass(el, 'noshow') }
    function kidsOf (id) {
        var ks = [];
        var trs = comments();
        var i = apos($(id), trs);
        if (i >= 0) {
            ks = acut(trs, i + 1);
            var n = ind($(id));
            var j = apos(function(tr) {return ind(tr) <= n}, ks);
            if (j >= 0) { ks = acut(ks, 0, j) }
        }
        return ks;
    }
    function squish (tr) {
        if (hasClass(tr, 'noshow')) return;
        aeach(noshow, kidsOf(tr.id));
        var el = byClass(tr, 'togg')[0];
        el.innerHTML = '[+' + el.getAttribute('n') + ']';
        noshow(byClass(tr, 'comment')[0]);
        vis(byClass(tr, 'votelinks')[0], false);
    }
    function expand (tr) {
        elShow(tr);
        elShow(byClass(tr, 'comment')[0]);
        vis(byClass(tr, 'votelinks')[0], true);
        byClass(tr, 'togg')[0].innerHTML = '[-]';
    }
    function recoll() {
        aeach(expand, comments());
        aeach(squish, collapsed());
    }
    // /End hn.js polyfill

    const NOW = new Date();
    const MINUTE_TYPE = 'Minutes';
    const HOUR_TYPE = 'Hours';
    const DAY_TYPE = 'Date';
    const quantitySelector = 'hnhoc-time-val';
    const typeSelector = 'hnhoc-time-type';
    const buttonSelector = 'hnhc-submit-button';

    function findBranchesToTrim(comments, olderThan) {
        const commentsToHide = [];
        for (let comment of comments) {
            const [isVisible, descendantsToHide] = evaluateComment(comment, olderThan);
            commentsToHide.push(...descendantsToHide);
        }
        return commentsToHide;
    }

    function hideComments(comments) {
        for (let comment of comments) {
            addClass(comment.el, 'coll');
        }
    }

    function showComments (comments) {
        for (let comment of comments) {
            remClass(comment.el, 'coll');
        }
    }

    function evaluateComment(comment, olderThan) {
        if (comment.isYoungerThan(olderThan)) {
            // all descendants will naturally be younger that this and will not need to be hidden
            return [true, []];
        }

        // Accumulate data about children and ancestors
        const visibleChildren = [];
        const hiddenChildren = [];
        const allHiddenDescendants = [];

        for (let child of comment.children) {
            const [childIsVisible, descendantsToHide] = evaluateComment(child, olderThan);

            if (childIsVisible) {
                visibleChildren.push(child);
            } else {
                hiddenChildren.push(child);
            }
            allHiddenDescendants.push(...descendantsToHide);
        }

        if (visibleChildren.length) {
            // this has visible children, so we need to pass along any nodes that
            // have already been flagged as old
            return [true, allHiddenDescendants];
        } else {
            // this has no visible children and is not visible itself
            // so override existing running list of hiddenDescendants
            return [false, [comment]];
        }
    }

    /**
     * @param {UserComment} comment
     * @param {UserComment} previous
     */
    function findParentForComment(comment, previous) {
        if (!previous) {
            return null;
        }

        const indent = comment.getIndent();
        if (indent === 0) {
            // top level comment
            return null;
        } else if (indent > previous.getIndent()) {
            // sibling comment
            return previous;
        } else {
            // somewhere in the previous ancenstors is a parent to this comment
            return findParentForComment(comment, previous.parent);
        }
    }

    function createTrees() {
        const elements = document.querySelectorAll('.athing.comtr');
        const trees = [];
        let previousComment;
        for (let el of elements) {
            const comment = new UserComment(el);
            const parent = findParentForComment(comment, previousComment);
            if (parent) {
                comment.setParent(parent);
            } else {
                trees.push(comment);
            }
            previousComment = comment;
        }
        return trees;
    }

    /**
     * @param el
     * @constructor
     */
    function UserComment(el) {
        this.el = el;
        this.parent = null;
        this.children = [];
    }

    window.UserComment = UserComment;

    /**
     * @param {UserComment} parent
     */
    UserComment.prototype.setParent = function (parent) {
        this.parent = parent;
        this.parent.addChild(this);
    }
    /**
     * @param {UserComment} comment
     */
    UserComment.prototype.addChild = function (comment) {
        this.children.push(comment);
    }

    /**
     * @param {Number} referenceDate
     * @returns {boolean}
     */
    UserComment.prototype.isYoungerThan = function (referenceDate) {
        return this.getPostDate() >= referenceDate;
    }

    /**
     * @returns {Number}
     */
    UserComment.prototype.getPostDate = function () {
        return getPostDate(this.el.querySelector('.age>a').innerText, NOW);
    }

    /**
     * @returns {Number}
     */
    UserComment.prototype.getIndent = function () {
        return parseInt(this.el.querySelector('.ind>img').getAttribute('width'), 10);
    }


    /**
     * Subtract a value from a date
     * @param {Date} date [MINUTE_TYPE|HOUR_TYPE|DAY_TYPE]
     * @param {String} type
     * @param {Number|String} amount
     * @returns {Number} a new date as a number, with the time subtracted
     */
    function subtractTime(date, type, amount) {
        const getter = 'get' + type;
        const setter = 'set' + type;
        return new Date(date)[setter](date[getter]() - parseInt(amount, 10));
    }

    /**
     * Return a date that fulfills "11 minutes ago" or "1 day ago" for a reference date
     *
     * Notes:
     *  - Posts less than a minute old shows as "0 minutes ago"
     *  - Posts greater than a year show as "1345 days ago"
     *
     * @param {String} dateString e.g. "11 minutes ago"
     * @param {Date} reference Date to subtract time from
     * @returns {Number}
     */
    function getPostDate(dateString, reference) {
        // e.g. 1 minute ago or 11 minutes ago
        const minuteIndex = dateString.indexOf('minute');
        if (minuteIndex !== -1) {
            return subtractTime(reference, MINUTE_TYPE, dateString.slice(0, minuteIndex - 1));
        }

        // e.g. 1 hour ago or 11 hours ago
        const hourIndex = dateString.indexOf('hour');
        if (hourIndex !== -1) {
            return subtractTime(reference, HOUR_TYPE, dateString.slice(0, hourIndex - 1));
        }

        // e.g. 1 day ago or 11 days ago
        const dayIndex = dateString.indexOf('day');
        if (dayIndex !== -1) {
            return subtractTime(reference, DAY_TYPE, dateString.slice(0, dayIndex - 1));
        }
    }


    function main () {
        const timeVal = document.getElementById(quantitySelector).value;
        const timeType = document.getElementById(typeSelector).value;
        const cutoffDate = subtractTime(NOW, timeType, timeVal);

        const commentTrees = createTrees()
        const commentsToHide = findBranchesToTrim(commentTrees, cutoffDate);

        // remove the hidden state from all comments
        showComments(Array.from(document.querySelectorAll('.athing.comtr')).map(el => new UserComment(el)));
        // add the hidden state to old comments
        hideComments(commentsToHide);
        // re-paint
        recoll();
    }

    const body = `
<table class="fatitem" border="0">
    <tbody>
    <tr>
        <td colspan="2" class="ind">
            <img src="s.gif" height="1" width="20">
        </td>
        <td class="">
            <span>Hide comments older than:</span>
            <input id="${quantitySelector}" type="number" min="1" value="1" style="width: 4em">
            <select id="${typeSelector}">
                <option value="${MINUTE_TYPE}">Minute(s)</option>
                <option value="${HOUR_TYPE}">Hour(s)</option>
                <option value="${DAY_TYPE}">Day(s)</option>
            </select>
            <button id="${buttonSelector}">Filter</button>
        </td>
    </tr>
    </tbody>
</table>
        `;

    document
        .querySelector('table.comment-tree')
        .insertAdjacentHTML('beforebegin', body);

    document.getElementById(buttonSelector).addEventListener('click', main);
})();

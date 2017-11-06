/*
- create tree of elements
-
- Scan tree for elements that are too old
- Minimize any nodes whose children are all too old

el.noshow means the thing has already been hidden
el.coll means the thing is shown but collapsed
 */

/*
for each element
get current indent

 */
//
// if (!window.addClass) {
//     window.addClass = function (el, cl) {
//         if (el) {
//             var a = el.className.split(' ');
//             if (!afind(cl, a)) {
//                 a.unshift(cl);
//                 el.className = a.join(' ')
//             }
//         }
//     }
//
//     window.addClass = addClass
// }

(function () {
    const SECOND = 1000;
    const MINUTE = SECOND * 60;
    const HOUR = MINUTE * 60;
    const DAY = HOUR * 24;

    const NOW = new Date();

    function findNodesToHide(comments, olderThan) {
        const commentsToHide = [];
        for (let comment of comments) {
            const [isVisible, descendantsToHide] = evaluate(comment, olderThan);
            commentsToHide.push(...descendantsToHide);
        }
        return commentsToHide;
    }

    window.findNodesToHide = findNodesToHide;

    function hideComments(comments) {
        for (let comment of comments) {
            addClass(comment.el, 'coll');
        }
        recoll();
    }

    function showComments (comments) {
        for (let comment of comments) {
            remClass(comment.el, 'coll');
        }
        recoll();
    }
    window.hideComments = hideComments
    window.showComments = showComments

    function evaluate(comment, olderThan) {
        if (comment.isYoungerThan(olderThan)) {
            // all descendants will naturally be younger that this and will not need to be hidden
            return [true, []];
        }

        // Accumulate data about children and ancestors
        const visibleChildren = [];
        const hiddenChildren = [];
        const allHiddenDescendants = [];

        for (let child of comment.children) {
            const [childIsVisible, descendantsToHide] = evaluate(child, olderThan);

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

    window.evaluate = evaluate;


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
     * @returns {string}
     */
    UserComment.prototype.getAgeString = function () {
        return this.el.querySelector('.age>a').innerText;
    }

    /**
     * @returns {Number}
     */
    UserComment.prototype.getPostDate = function () {
        return getPostDate(this.getAgeString(), NOW);
    }

    /**
     * @returns {Number}
     */
    UserComment.prototype.getIndent = function () {
        return parseInt(this.el.querySelector('.ind>img').getAttribute('width'), 10);
    }


    /**
     * Subtract a value from a date
     * @param {Date} date
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
            return subtractTime(reference, 'Minutes', dateString.slice(0, minuteIndex - 1));
        }

        // e.g. 1 hour ago or 11 hours ago
        const hourIndex = dateString.indexOf('hour');
        if (hourIndex !== -1) {
            return subtractTime(reference, 'Hours', dateString.slice(0, hourIndex - 1));
        }

        // e.g. 1 day ago or 11 days ago
        const dayIndex = dateString.indexOf('day');
        if (dayIndex !== -1) {
            return subtractTime(reference, 'Date', dateString.slice(0, dayIndex - 1));
        }
    }

    window.getPostDate = getPostDate;

    window.createTrees = createTrees;
    window.trees = createTrees();
    window.allComments = Array.from(document.querySelectorAll('.athing.comtr')).map(el => new UserComment(el))
    window.hideAllComments = (s) => {
        let hidden = findNodesToHide(trees, getPostDate(s, NOW));
        hideComments(hidden);
        return hidden;
    }
    window.showAllComments = () => showComments(allComments);
    window.NOW = NOW;

})();

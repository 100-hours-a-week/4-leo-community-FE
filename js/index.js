import BoardItem from '../component/board/boardItem.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import { authCheck, getServerUrl, prependChild, resolveImageUrl } from '../utils/function.js';
import { getPosts, searchPosts } from '../api/indexRequest.js';

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const HTTP_NOT_AUTHORIZED = 401;
const SCROLL_THRESHOLD = 0.9;
const INITIAL_OFFSET = 5;
const ITEMS_PER_LOAD = 5;
const DEFAULT_SORT = 'recent';
let currentKeyword = '';
let currentSort = DEFAULT_SORT;
let cursor = 0;
let isEnd = false;
let isProcessing = false;

const updateSortVisibility = () => {
    const sortRow = document.querySelector('#searchSortRow');
    if (!sortRow) return;
    const isSearching = currentKeyword.trim().length > 0;
    sortRow.classList.toggle('isHidden', !isSearching);
    sortRow.setAttribute('aria-hidden', String(!isSearching));
};

// getBoardItem 함수
const getBoardItem = async (cursorValue = 0, sizeValue = 5) => {
    const result =
        currentKeyword.trim() === ''
            ? await getPosts(cursorValue, sizeValue)
            : await searchPosts(
                  currentKeyword,
                  cursorValue,
                  sizeValue,
                  currentSort,
              );
    if (!result.ok) {
        throw new Error('Failed to load post list.');
    }
    return result.data;
};

const setBoardItem = posts => {
    const boardList = document.querySelector('.boardList');
    if (boardList && posts) {
        const itemsHtml = posts
            .map(post =>
                BoardItem(
                    post.post_id,
                    post.created_at,
                    post.title,
                    post.view_count,
                    post.author ? post.author.profile_image_url : null,
                    post.author ? post.author.nickname : null,
                    post.comment_count,
                    post.like_count,
                ),
            )
            .join('');
        boardList.innerHTML += ` ${itemsHtml}`;
    }
};

const resetBoardList = () => {
    const boardList = document.querySelector('.boardList');
    if (boardList) {
        boardList.innerHTML = '';
    }
};

const loadBoardItems = async ({ reset = false } = {}) => {
    if (isProcessing || (!reset && isEnd)) return;
    isProcessing = true;

    try {
        if (reset) {
            cursor = 0;
            isEnd = false;
            resetBoardList();
        }

        // 백엔드에서 응답해주는 next_cursor와 has_next를 사용하여 페이지네이션 처리
        const pageData = await getBoardItem(cursor, ITEMS_PER_LOAD);
        const posts = pageData.posts;
        const pagination = pageData.pagination;

        if (!posts || posts.length === 0) {
            isEnd = true;
            return;
        }

        setBoardItem(posts);

        cursor = pagination.next_cursor;
        isEnd = !pagination.has_next;

    } catch (error) {
        console.error('Error fetching items:', error);
        isEnd = true;
    } finally {
        isProcessing = false;
    }
};

const addSearchEvent = () => {
    const searchInput = document.querySelector('#searchInput');
    const searchButton = document.querySelector('.searchButton');
    if (!searchInput || !searchButton) return;

    const runSearch = async () => {
        const trimmedKeyword = searchInput.value.trim();
        if (trimmedKeyword.length > 0 && trimmedKeyword.length < 2) {
            Dialog('검색 실패', '검색어는 2글자 이상 입력해주세요.');
            return;
        }
        currentKeyword = trimmedKeyword;
        updateSortVisibility();
        await loadBoardItems({ reset: true });
    };

    searchButton.addEventListener('click', runSearch);
    searchInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            runSearch();
        }
    });
};

const addSortEvent = () => {
    const sortSelect = document.querySelector('#searchSortSelect');
    if (!sortSelect) return;
    sortSelect.value = currentSort;

    sortSelect.addEventListener('change', async () => {
        currentSort = sortSelect.value || DEFAULT_SORT;
        if (currentKeyword.trim().length === 0) return;
        await loadBoardItems({ reset: true });
    });
};

// 스크롤 이벤트 추가
const addInfinityScrollEvent = () => {
    window.addEventListener('scroll', async () => {
        const hasScrolledToThreshold =
            window.scrollY + window.innerHeight >=
            document.documentElement.scrollHeight * SCROLL_THRESHOLD;
        if (hasScrolledToThreshold) {
            loadBoardItems();
        }
    });
};

const init = async () => {
    try {
        const response = await authCheck();
        const data = await response.json();
        if (response.status === HTTP_NOT_AUTHORIZED) {
            window.location.href = '/html/login.html';
            return;
        }

        const profileImageUrl = resolveImageUrl(
            data.data.profile_image_url,
            DEFAULT_PROFILE_IMAGE,
        );

        prependChild(
            document.body,
            Header('Community', 0, profileImageUrl),
        );

        updateSortVisibility();
        await loadBoardItems({ reset: true });

        addSearchEvent();
        addSortEvent();
        addInfinityScrollEvent();
    } catch (error) {
        console.error('Initialization failed:', error);
    }
};

init();

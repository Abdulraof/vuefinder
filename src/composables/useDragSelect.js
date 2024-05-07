import {ref, onMounted, onUpdated, onUnmounted, nextTick} from 'vue';
import DragSelect from 'dragselect';
import {
  OverlayScrollbars,
  ScrollbarsHidingPlugin,
  SizeObserverPlugin,
  ClickScrollPlugin,
} from 'overlayscrollbars';

export default function () {
    let dragSelectInstance;
    const area = ref(null);
    const explorerId = Math.floor(Math.random() * 2 ** 32);
    const isDraggingRef = ref(false);
    const selectedItems = ref([]);
    const getSelected = () => selectedItems.value;
    const getSelection = () => dragSelectInstance.getSelection();
    const getCount = () => selectedItems.value.length;
    const clearSelection = () => dragSelectInstance.clearSelection(true);
    const onSelectCallback = ref();
    const osInstance = ref(null);

    function initDragSelect() {
        dragSelectInstance = new DragSelect({
            area: area.value,
            keyboardDrag: false,
            selectedClass: 'vf-explorer-selected',
            selectorClass: 'vf-explorer-selector',
        });

        dragSelectInstance.subscribe('DS:start:pre', ({items, event, isDragging}) => {
            if (isDragging) {
                dragSelectInstance.Interaction._reset(event);
            } else {
                // Prevent starting selection when start resizing the selectable area from the corner.
                const offsetX = area.value.offsetWidth - event.offsetX;
                const offsetY = area.value.offsetHeight - event.offsetY;
                if (offsetX < 15 && offsetY < 15) {
                    dragSelectInstance.Interaction._reset(event);
                }
                if (event.target.classList.contains('os-scrollbar-handle')) {
                    dragSelectInstance.Interaction._reset(event);
                }
            }
        });

        // dragSelectInstance.subscribe('DS:scroll', ({isDragging, scroll_multiplier, scroll_directions ,items}) => {
        //     if (!isDragging) {
        //         if (!osInstance.value) {
        //             return;
        //         }
        //
        //         const {overflowAmount} = osInstance.value.state();
        //         const {scrollOffsetElement} = osInstance.value.elements();
        //         const {scrollTop} = scrollOffsetElement;
        //         scroll_multiplier = scroll_multiplier * (scroll_directions.includes('top') ? -1 : 1);
        //         scrollOffsetElement.scrollTo({
        //             behavior: 'smooth',
        //             left: 0,
        //             top: scrollTop + (overflowAmount.y /scroll_multiplier),
        //         });
        //         console.log(overflowAmount.y /scroll_multiplier)
        //     }
        // });
        // Immediately update the selection when dragging ends.
        document.addEventListener('dragleave', (e) => {
            if (!e.buttons && isDraggingRef.value) {
                isDraggingRef.value = false;
            }
        });
    }

    // Refresh selection after the list is updated.
    const refreshSelection = () => nextTick(() => {
        const currentSelectedItems = getSelected().map((item) => item.path);

        clearSelection();
        // reinitialize the selectables
        dragSelectInstance.setSettings({
            selectables: document.getElementsByClassName('vf-item-' + explorerId),
        })

        // add the previously selected items
        dragSelectInstance.addSelection(
            dragSelectInstance.getSelectables()
                .filter(el => currentSelectedItems.includes(JSON.parse(el.dataset.item).path))
        );

        // update selection
        selectedItems.value = dragSelectInstance.getSelection().map((el) => JSON.parse(el.dataset.item));
        onSelectCallback.value(selectedItems.value);
    });

    const onSelect = (callback) => {
        onSelectCallback.value = callback;

        dragSelectInstance.subscribe("DS:end", ({items, event, isDragging}) => {
            selectedItems.value = items.map((el) => JSON.parse(el.dataset.item));
            callback(items.map((el) => JSON.parse(el.dataset.item)));
        });
    }

    onMounted(() => {
        OverlayScrollbars(area.value, {
            scrollbars: {
                theme: 'vf-theme-dark dark:vf-theme-light',
            },
            plugins: {
                ScrollbarsHidingPlugin,
                SizeObserverPlugin,
                ClickScrollPlugin
            },
        }, {
            initialized: (instance) => {
                osInstance.value = instance;
            }
        });

        initDragSelect()
    });

    onUnmounted(() => {
        if (dragSelectInstance) dragSelectInstance.stop();
    });

    onUpdated(() => {
        if (dragSelectInstance) dragSelectInstance.Area.reset()
    });

    return {
        area,
        explorerId,
        isDraggingRef,
        getSelected,
        getSelection,
        clearSelection,
        refreshSelection,
        getCount,
        onSelect
    }
}

import React, { useCallback, useState } from "react";
import { serializeLibraryAsJSON } from "../data/json";
import { t } from "../i18n";
import {
  ExcalidrawProps,
  LibraryItem,
  LibraryItems,
  UIAppState,
} from "../types";
import { arrayToMap } from "../utils";
import Stack from "./Stack";
import { MIME_TYPES } from "../constants";
import Spinner from "./Spinner";
import { duplicateElements } from "../element/newElement";
import { LibraryMenuControlButtons } from "./LibraryMenuControlButtons";
import { LibraryDropdownMenu } from "./LibraryMenuHeaderContent";
import LibraryMenuSection from "./LibraryMenuSection";
import { useLibraryCache } from "../hooks/useLibraryItemSvg";

import "./LibraryMenuItems.scss";

export default function LibraryMenuItems({
  isLoading,
  libraryItems,
  onAddToLibrary,
  onInsertLibraryItems,
  pendingElements,
  theme,
  id,
  libraryReturnUrl,
}: {
  isLoading: boolean;
  libraryItems: LibraryItems;
  pendingElements: LibraryItem["elements"];
  onInsertLibraryItems: (libraryItems: LibraryItems) => void;
  onAddToLibrary: (elements: LibraryItem["elements"]) => void;
  libraryReturnUrl: ExcalidrawProps["libraryReturnUrl"];
  theme: UIAppState["theme"];
  id: string;
}) {
  const [selectedItems, setSelectedItems] = useState<LibraryItem["id"][]>([]);
  const { svgCache } = useLibraryCache();

  const unpublishedItems = libraryItems.filter(
    (item) => item.status !== "published",
  );
  const publishedItems = libraryItems.filter(
    (item) => item.status === "published",
  );

  const showBtn = !libraryItems.length && !pendingElements.length;

  const isLibraryEmpty =
    !pendingElements.length &&
    !unpublishedItems.length &&
    !publishedItems.length;

  const [lastSelectedItem, setLastSelectedItem] = useState<
    LibraryItem["id"] | null
  >(null);

  const onItemSelectToggle = (
    id: LibraryItem["id"],
    event: React.MouseEvent,
  ) => {
    const shouldSelect = !selectedItems.includes(id);

    const orderedItems = [...unpublishedItems, ...publishedItems];

    if (shouldSelect) {
      if (event.shiftKey && lastSelectedItem) {
        const rangeStart = orderedItems.findIndex(
          (item) => item.id === lastSelectedItem,
        );
        const rangeEnd = orderedItems.findIndex((item) => item.id === id);

        if (rangeStart === -1 || rangeEnd === -1) {
          setSelectedItems([...selectedItems, id]);
          return;
        }

        const selectedItemsMap = arrayToMap(selectedItems);
        const nextSelectedIds = orderedItems.reduce(
          (acc: LibraryItem["id"][], item, idx) => {
            if (
              (idx >= rangeStart && idx <= rangeEnd) ||
              selectedItemsMap.has(item.id)
            ) {
              acc.push(item.id);
            }
            return acc;
          },
          [],
        );

        setSelectedItems(nextSelectedIds);
      } else {
        setSelectedItems([...selectedItems, id]);
      }
      setLastSelectedItem(id);
    } else {
      setLastSelectedItem(null);
      setSelectedItems(selectedItems.filter((_id) => _id !== id));
    }
  };

  const getInsertedElements = useCallback(
    (id: string) => {
      let targetElements;
      if (selectedItems.includes(id)) {
        targetElements = libraryItems.filter((item) =>
          selectedItems.includes(item.id),
        );
      } else {
        targetElements = libraryItems.filter((item) => item.id === id);
      }
      return targetElements.map((item) => {
        return {
          ...item,
          // duplicate each library item before inserting on canvas to confine
          // ids and bindings to each library item. See #6465
          elements: duplicateElements(item.elements, { randomizeSeed: true }),
        };
      });
    },
    [libraryItems, selectedItems],
  );

  const onItemDrag = (id: LibraryItem["id"], event: React.DragEvent) => {
    event.dataTransfer.setData(
      MIME_TYPES.excalidrawlib,
      serializeLibraryAsJSON(getInsertedElements(id)),
    );
  };

  const isItemSelected = (id: LibraryItem["id"] | null) => {
    if (!id) {
      return false;
    }

    return selectedItems.includes(id);
  };

  const onItemClick = useCallback(
    (id: LibraryItem["id"] | null) => {
      if (!id) {
        onAddToLibrary(pendingElements);
      } else {
        onInsertLibraryItems(getInsertedElements(id));
      }
    },
    [
      getInsertedElements,
      onAddToLibrary,
      onInsertLibraryItems,
      pendingElements,
    ],
  );

  return (
    <div
      className="library-menu-items-container"
      style={
        pendingElements.length ||
        unpublishedItems.length ||
        publishedItems.length
          ? { justifyContent: "flex-start" }
          : { borderBottom: 0 }
      }
    >
      {!isLibraryEmpty && (
        <LibraryDropdownMenu
          selectedItems={selectedItems}
          onSelectItems={setSelectedItems}
          className="library-menu-dropdown-container--in-heading"
        />
      )}
      <Stack.Col
        className="library-menu-items-container__items"
        align="start"
        gap={1}
        style={{
          flex: publishedItems.length > 0 ? 1 : "0 1 auto",
          marginBottom: 0,
        }}
      >
        <>
          {!isLibraryEmpty && (
            <div className="library-menu-items-container__header">
              {t("labels.personalLib")}
            </div>
          )}
          {isLoading && (
            <div
              style={{
                position: "absolute",
                top: "var(--container-padding-y)",
                right: "var(--container-padding-x)",
                transform: "translateY(50%)",
              }}
            >
              <Spinner />
            </div>
          )}
          {!pendingElements.length && !unpublishedItems.length ? (
            <div className="library-menu-items__no-items">
              <div className="library-menu-items__no-items__label">
                {t("library.noItems")}
              </div>
              <div className="library-menu-items__no-items__hint">
                {publishedItems.length > 0
                  ? t("library.hint_emptyPrivateLibrary")
                  : t("library.hint_emptyLibrary")}
              </div>
            </div>
          ) : (
            <LibraryMenuSection
              items={[
                // append pending library item
                ...(pendingElements.length
                  ? [{ id: null, elements: pendingElements }]
                  : []),
                ...unpublishedItems,
              ]}
              onItemSelectToggle={onItemSelectToggle}
              onItemDrag={onItemDrag}
              onClick={onItemClick}
              isItemSelected={isItemSelected}
              svgCache={svgCache}
            />
          )}
        </>

        <>
          {(publishedItems.length > 0 ||
            pendingElements.length > 0 ||
            unpublishedItems.length > 0) && (
            <div className="library-menu-items-container__header library-menu-items-container__header--excal">
              {t("labels.excalidrawLib")}
            </div>
          )}
          {publishedItems.length > 0 ? (
            <LibraryMenuSection
              items={publishedItems}
              onItemSelectToggle={onItemSelectToggle}
              onItemDrag={onItemDrag}
              onClick={onItemClick}
              isItemSelected={isItemSelected}
              svgCache={svgCache}
            />
          ) : unpublishedItems.length > 0 ? (
            <div
              style={{
                margin: "1rem 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                fontSize: ".9rem",
              }}
            >
              {t("library.noItems")}
            </div>
          ) : null}
        </>

        {showBtn && (
          <LibraryMenuControlButtons
            style={{ padding: "16px 0", width: "100%" }}
            id={id}
            libraryReturnUrl={libraryReturnUrl}
            theme={theme}
          >
            <LibraryDropdownMenu
              selectedItems={selectedItems}
              onSelectItems={setSelectedItems}
            />
          </LibraryMenuControlButtons>
        )}
      </Stack.Col>
    </div>
  );
}

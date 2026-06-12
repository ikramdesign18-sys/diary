import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { AmanatSticker } from "@/components/vector-assets/AmanatSticker";
import { getVectorAsset } from "@/constants/vectorAssetRegistry";
import type { PageSticker } from "@/types";

export const STICKER_PAGE_WIDTH = 320;
export const STICKER_PAGE_HEIGHT = 600;
const MIN_STICKER_SIZE = 44;
const MAX_STICKER_SIZE = 180;

type StickerLayout = Required<Pick<PageSticker, "x" | "y" | "width" | "height" | "rotation" | "zIndex">>;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function stickerLayout(sticker: PageSticker, index: number): StickerLayout {
  const width = clamp(sticker.width ?? 70, MIN_STICKER_SIZE, MAX_STICKER_SIZE);
  const height = clamp(sticker.height ?? width, MIN_STICKER_SIZE, MAX_STICKER_SIZE);
  return {
    x: clamp(sticker.x ?? 18 + (index % 3) * 92, 0, STICKER_PAGE_WIDTH - width),
    y: clamp(sticker.y ?? 150 + Math.floor(index / 3) * 92, 0, STICKER_PAGE_HEIGHT - height),
    width,
    height,
    rotation: sticker.rotation ?? 0,
    zIndex: sticker.zIndex ?? index + 1,
  };
}

function EditableSticker({
  sticker,
  index,
  scale,
  accent,
  selected,
  onSelect,
  onDone,
  onChange,
  onRemove,
}: {
  sticker: PageSticker;
  index: number;
  scale: number;
  accent: string;
  selected: boolean;
  onSelect: () => void;
  onDone: () => void;
  onChange: (patch: Partial<PageSticker>) => void;
  onRemove: () => void;
}) {
  const [layout, setLayout] = useState(() => stickerLayout(sticker, index));
  const layoutRef = useRef(layout);
  const startRef = useRef(layout);
  const interactingRef = useRef(false);

  const setDraft = (next: StickerLayout) => {
    layoutRef.current = next;
    setLayout(next);
  };

  useEffect(() => {
    if (!interactingRef.current) setDraft(stickerLayout(sticker, index));
  }, [index, sticker]);

  const commit = () => {
    interactingRef.current = false;
    onChange(layoutRef.current);
  };

  const moveResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
    onPanResponderGrant: () => {
      interactingRef.current = true;
      startRef.current = layoutRef.current;
      onSelect();
    },
    onPanResponderMove: (_, gesture) => {
      const start = startRef.current;
      setDraft({
        ...layoutRef.current,
        x: clamp(start.x + gesture.dx / scale, 0, STICKER_PAGE_WIDTH - start.width),
        y: clamp(start.y + gesture.dy / scale, 0, STICKER_PAGE_HEIGHT - start.height),
      });
    },
    onPanResponderRelease: commit,
    onPanResponderTerminate: commit,
  }), [scale, onSelect, onChange]);

  const resizeResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: () => {
      interactingRef.current = true;
      startRef.current = layoutRef.current;
      onSelect();
    },
    onPanResponderMove: (_, gesture) => {
      const start = startRef.current;
      const delta = Math.max(gesture.dx, gesture.dy) / scale;
      const size = clamp(start.width + delta, MIN_STICKER_SIZE, Math.min(MAX_STICKER_SIZE, STICKER_PAGE_WIDTH - start.x, STICKER_PAGE_HEIGHT - start.y));
      setDraft({ ...layoutRef.current, width: size, height: size });
    },
    onPanResponderRelease: commit,
    onPanResponderTerminate: commit,
  }), [scale, onSelect, onChange]);

  const assetId = sticker.assetId ?? sticker.id;
  const asset = getVectorAsset(assetId);
  const size = Math.min(layout.width, layout.height) * scale;

  return (
    <Pressable
      onPress={onSelect}
      {...moveResponder.panHandlers}
      style={[
        styles.placedSticker,
        {
          left: layout.x * scale,
          top: layout.y * scale,
          width: layout.width * scale,
          height: layout.height * scale,
          zIndex: selected ? 1000 : layout.zIndex,
          transform: [{ rotate: `${layout.rotation}deg` }],
          borderColor: selected ? accent : "transparent",
          backgroundColor: selected ? accent + "0D" : "transparent",
        },
      ]}
    >
      {sticker.assetId || asset
        ? <AmanatSticker id={assetId} size={size} color={asset?.defaultColors.color} accent={asset?.defaultColors.accent} />
        : <Text style={[styles.emoji, { fontSize: size * 0.58 }]}>{sticker.emoji ?? "✦"}</Text>}
      {selected && <>
        <TouchableOpacity onPress={onRemove} style={[styles.control, styles.remove, { backgroundColor: accent }]}>
          <Feather name="x" size={13} color="#FFFDF9" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onChange({ rotation: (layout.rotation + 15) % 360 })} style={[styles.control, styles.rotate, { backgroundColor: accent }]}>
          <Feather name="rotate-cw" size={12} color="#FFFDF9" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDone} style={[styles.control, styles.done, { backgroundColor: accent }]}>
          <Feather name="check" size={13} color="#FFFDF9" />
        </TouchableOpacity>
        <View {...resizeResponder.panHandlers} style={[styles.control, styles.resize, { backgroundColor: accent }]}>
          <Feather name="maximize-2" size={12} color="#FFFDF9" />
        </View>
      </>}
    </Pressable>
  );
}

export function PageStickerCanvas({
  stickers,
  accent,
  editable = false,
  onChange,
}: {
  stickers?: PageSticker[];
  accent: string;
  editable?: boolean;
  onChange?: (stickers: PageSticker[]) => void;
}) {
  const [width, setWidth] = useState(STICKER_PAGE_WIDTH);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scale = width / STICKER_PAGE_WIDTH;
  const updateSticker = (id: string, patch: Partial<PageSticker>) => {
    onChange?.((stickers ?? []).map(sticker => sticker.id === id ? { ...sticker, ...patch } : sticker));
  };
  const removeSticker = (id: string) => {
    setSelectedId(null);
    onChange?.((stickers ?? []).filter(sticker => sticker.id !== id));
  };
  const handleLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width || STICKER_PAGE_WIDTH);

  if (!stickers?.length) return null;
  return (
    <View
      pointerEvents={editable ? "box-none" : "none"}
      onLayout={handleLayout}
      style={[styles.canvas, { height: STICKER_PAGE_HEIGHT * scale }]}
    >
      {stickers.map((sticker, index) => editable
        ? <EditableSticker
          key={sticker.id}
          sticker={sticker}
          index={index}
          scale={scale}
          accent={accent}
          selected={selectedId === sticker.id}
          onSelect={() => setSelectedId(sticker.id)}
          onDone={() => setSelectedId(null)}
          onChange={patch => updateSticker(sticker.id, patch)}
          onRemove={() => removeSticker(sticker.id)}
        />
        : <StaticSticker key={sticker.id} sticker={sticker} index={index} scale={scale} />
      )}
    </View>
  );
}

function StaticSticker({ sticker, index, scale }: { sticker: PageSticker; index: number; scale: number }) {
  const layout = stickerLayout(sticker, index);
  const assetId = sticker.assetId ?? sticker.id;
  const asset = getVectorAsset(assetId);
  const size = Math.min(layout.width, layout.height) * scale;
  return <View style={[styles.placedSticker, {
    left: layout.x * scale,
    top: layout.y * scale,
    width: layout.width * scale,
    height: layout.height * scale,
    zIndex: layout.zIndex,
    transform: [{ rotate: `${layout.rotation}deg` }],
  }]}>
    {sticker.assetId || asset
      ? <AmanatSticker id={assetId} size={size} color={asset?.defaultColors.color} accent={asset?.defaultColors.accent} />
      : <Text style={[styles.emoji, { fontSize: size * 0.58 }]}>{sticker.emoji ?? "✦"}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  canvas: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 },
  placedSticker: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 12,
  },
  emoji: { textAlign: "center" },
  control: {
    position: "absolute",
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  remove: { top: -13, right: -13 },
  done: { top: -13, left: -13 },
  rotate: { bottom: -13, left: -13 },
  resize: { bottom: -13, right: -13 },
});

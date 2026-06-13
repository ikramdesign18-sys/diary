import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Keyboard, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { AmanatSticker } from "@/components/vector-assets/AmanatSticker";
import { getVectorAsset } from "@/constants/vectorAssetRegistry";
import type { PageSticker } from "@/types";

export const STICKER_PAGE_WIDTH = 320;
export const STICKER_PAGE_HEIGHT = 600;
export const PAGE_CONTENT_HORIZONTAL_PADDING = 28;
export const PAGE_CONTENT_TOP_PADDING = 24;
const MIN_STICKER_SIZE = 44;
const MAX_STICKER_SIZE = STICKER_PAGE_WIDTH;
const CONTROL_SIZE = 38;

type StickerLayout = Required<Pick<PageSticker, "x" | "y" | "width" | "height" | "rotation" | "zIndex">>;

const clamp = (value: number, min: number, max: number) => {
  "worklet";
  return Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);
};

function stickerLayout(sticker: PageSticker, index: number): StickerLayout {
  const normalizedWidth = Number.isFinite(sticker.widthPercent) ? sticker.widthPercent! * STICKER_PAGE_WIDTH : undefined;
  const normalizedHeight = Number.isFinite(sticker.heightPercent) ? sticker.heightPercent! * STICKER_PAGE_HEIGHT : undefined;
  const width = clamp(normalizedWidth ?? sticker.width ?? 70, MIN_STICKER_SIZE, MAX_STICKER_SIZE);
  const height = clamp(normalizedHeight ?? sticker.height ?? width, MIN_STICKER_SIZE, MAX_STICKER_SIZE);
  const normalizedX = Number.isFinite(sticker.xPercent) ? sticker.xPercent! * STICKER_PAGE_WIDTH : undefined;
  const normalizedY = Number.isFinite(sticker.yPercent) ? sticker.yPercent! * STICKER_PAGE_HEIGHT : undefined;
  return {
    x: clamp(normalizedX ?? sticker.x ?? 18 + (index % 3) * 92, 0, STICKER_PAGE_WIDTH - width),
    y: clamp(normalizedY ?? sticker.y ?? 150 + Math.floor(index / 3) * 92, 0, STICKER_PAGE_HEIGHT - height),
    width,
    height,
    rotation: Number.isFinite(sticker.rotation) ? sticker.rotation! : 0,
    zIndex: Number.isFinite(sticker.zIndex) ? sticker.zIndex! : index + 1,
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
  const initial = stickerLayout(sticker, index);
  const x = useSharedValue(initial.x);
  const y = useSharedValue(initial.y);
  const width = useSharedValue(initial.width);
  const height = useSharedValue(initial.height);
  const rotation = useSharedValue(initial.rotation);
  const startX = useSharedValue(initial.x);
  const startY = useSharedValue(initial.y);
  const startWidth = useSharedValue(initial.width);
  const startHeight = useSharedValue(initial.height);
  const startRotation = useSharedValue(initial.rotation);

  const selectSticker = useCallback(() => {
    Keyboard.dismiss();
    onSelect();
  }, [onSelect]);

  const commit = useCallback((nextX: number, nextY: number, nextWidth: number, nextHeight: number, nextRotation: number) => {
    const safeWidth = clamp(nextWidth, MIN_STICKER_SIZE, MAX_STICKER_SIZE);
    const safeHeight = clamp(nextHeight, MIN_STICKER_SIZE, Math.min(MAX_STICKER_SIZE, STICKER_PAGE_HEIGHT));
    onChange({
      x: clamp(nextX, 0, STICKER_PAGE_WIDTH - safeWidth),
      y: clamp(nextY, 0, STICKER_PAGE_HEIGHT - safeHeight),
      width: safeWidth,
      height: safeHeight,
      xPercent: clamp(nextX, 0, STICKER_PAGE_WIDTH - safeWidth) / STICKER_PAGE_WIDTH,
      yPercent: clamp(nextY, 0, STICKER_PAGE_HEIGHT - safeHeight) / STICKER_PAGE_HEIGHT,
      widthPercent: safeWidth / STICKER_PAGE_WIDTH,
      heightPercent: safeHeight / STICKER_PAGE_HEIGHT,
      rotation: Number.isFinite(nextRotation) ? nextRotation : 0,
    });
  }, [onChange]);

  useEffect(() => {
    const next = stickerLayout(sticker, index);
    x.value = next.x;
    y.value = next.y;
    width.value = next.width;
    height.value = next.height;
    rotation.value = next.rotation;
  }, [height, index, rotation, sticker, width, x, y]);

  const beginGesture = () => {
    "worklet";
    startX.value = x.value;
    startY.value = y.value;
    startWidth.value = width.value;
    startHeight.value = height.value;
    startRotation.value = rotation.value;
    runOnJS(selectSticker)();
  };

  const finishGesture = () => {
    "worklet";
    runOnJS(commit)(x.value, y.value, width.value, height.value, rotation.value);
  };

  const pinch = Gesture.Pinch()
    .onBegin(beginGesture)
    .onUpdate(event => {
      const ratio = startHeight.value / startWidth.value;
      const nextWidth = clamp(startWidth.value * event.scale, MIN_STICKER_SIZE, Math.min(MAX_STICKER_SIZE, STICKER_PAGE_WIDTH - x.value));
      const nextHeight = clamp(nextWidth * ratio, MIN_STICKER_SIZE, Math.min(MAX_STICKER_SIZE, STICKER_PAGE_HEIGHT - y.value));
      width.value = nextWidth;
      height.value = nextHeight;
    })
    .onFinalize(finishGesture);

  const rotate = Gesture.Rotation()
    .onBegin(beginGesture)
    .onUpdate(event => {
      rotation.value = startRotation.value + event.rotation * 180 / Math.PI;
    })
    .onFinalize(finishGesture);

  const resize = Gesture.Pan()
    .minDistance(0)
    .onBegin(beginGesture)
    .onUpdate(event => {
      const ratio = startHeight.value / startWidth.value;
      const delta = Math.max(event.translationX, event.translationY) / scale;
      const nextWidth = clamp(startWidth.value + delta, MIN_STICKER_SIZE, Math.min(MAX_STICKER_SIZE, STICKER_PAGE_WIDTH - x.value));
      const nextHeight = clamp(nextWidth * ratio, MIN_STICKER_SIZE, Math.min(MAX_STICKER_SIZE, STICKER_PAGE_HEIGHT - y.value));
      width.value = nextWidth;
      height.value = nextHeight;
    })
    .onFinalize(finishGesture);

  const pan = Gesture.Pan()
    .minDistance(1)
    .maxPointers(1)
    .onBegin(beginGesture)
    .onUpdate(event => {
      x.value = clamp(startX.value + event.translationX / scale, 0, STICKER_PAGE_WIDTH - width.value);
      y.value = clamp(startY.value + event.translationY / scale, 0, STICKER_PAGE_HEIGHT - height.value);
    })
    .onFinalize(finishGesture);

  const stickerGesture = Gesture.Simultaneous(pan, pinch, rotate);
  const animatedStyle = useAnimatedStyle(() => ({
    left: x.value * scale,
    top: y.value * scale,
    width: width.value * scale,
    height: height.value * scale,
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const assetId = sticker.assetId ?? sticker.id;
  const asset = getVectorAsset(assetId);
  const visualSize = Math.min(initial.width, initial.height) * scale;

  return (
    <GestureDetector gesture={stickerGesture}>
      <Animated.View
        style={[
          styles.placedSticker,
          animatedStyle,
          {
            zIndex: selected ? 1000 : initial.zIndex,
            borderColor: selected ? accent : "transparent",
            backgroundColor: selected ? accent + "0D" : "transparent",
          },
        ]}
      >
        <AnimatedStickerContent
          assetId={assetId}
          emoji={sticker.emoji}
          size={visualSize}
          width={width}
          height={height}
          scale={scale}
          color={asset?.defaultColors.color}
          accent={asset?.defaultColors.accent}
        />
        {selected && <>
          <Pressable hitSlop={8} onPress={onRemove} style={[styles.control, styles.remove, { backgroundColor: accent }]}>
            <Feather name="x" size={18} color="#FFFDF9" />
          </Pressable>
          <Pressable hitSlop={8} onPress={onDone} style={[styles.control, styles.done, { backgroundColor: accent }]}>
            <Feather name="check" size={18} color="#FFFDF9" />
          </Pressable>
          <GestureDetector gesture={resize}>
            <Animated.View style={[styles.control, styles.resize, { backgroundColor: accent }]}>
              <Feather name="maximize-2" size={17} color="#FFFDF9" />
            </Animated.View>
          </GestureDetector>
        </>}
      </Animated.View>
    </GestureDetector>
  );
}

function AnimatedStickerContent({
  assetId,
  emoji,
  size,
  width,
  height,
  scale,
  color,
  accent,
}: {
  assetId: string;
  emoji?: string;
  size: number;
  width: SharedValue<number>;
  height: SharedValue<number>;
  scale: number;
  color?: string;
  accent?: string;
}) {
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: Math.min(width.value, height.value) * scale / size }],
  }));
  const asset = getVectorAsset(assetId);
  return (
    <Animated.View pointerEvents="none" style={contentStyle}>
      {asset
        ? <AmanatSticker id={assetId} size={size} color={color} accent={accent} />
        : <Text style={[styles.emoji, { fontSize: size * 0.58 }]}>{emoji ?? "✦"}</Text>}
    </Animated.View>
  );
}

export function PageStickerCanvas({
  stickers,
  accent,
  editable = false,
  onChange,
  onEditingChange,
}: {
  stickers?: PageSticker[];
  accent: string;
  editable?: boolean;
  onChange?: (stickers: PageSticker[]) => void;
  onEditingChange?: (editing: boolean) => void;
}) {
  const [width, setWidth] = useState(STICKER_PAGE_WIDTH);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const scale = width / STICKER_PAGE_WIDTH;
  const selectSticker = (id: string | null) => {
    setSelectedId(id);
    onEditingChange?.(id !== null);
  };
  const updateSticker = (id: string, patch: Partial<PageSticker>) => {
    onChange?.((stickers ?? []).map(sticker => sticker.id === id ? { ...sticker, ...patch } : sticker));
  };
  const removeSticker = (id: string) => {
    selectSticker(null);
    onChange?.((stickers ?? []).filter(sticker => sticker.id !== id));
  };
  const handleLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width || STICKER_PAGE_WIDTH);

  useEffect(() => () => onEditingChange?.(false), [onEditingChange]);

  if (!stickers?.length) return null;
  return (
    <View
      pointerEvents={editable ? "box-none" : "none"}
      onLayout={handleLayout}
      style={[styles.canvas, { height: STICKER_PAGE_HEIGHT * scale }]}
    >
      {editable && selectedId && <Pressable onPress={() => selectSticker(null)} style={styles.deselectArea} />}
      {stickers.map((sticker, index) => editable
        ? <EditableSticker
          key={sticker.id}
          sticker={sticker}
          index={index}
          scale={scale}
          accent={accent}
          selected={selectedId === sticker.id}
          onSelect={() => selectSticker(sticker.id)}
          onDone={() => selectSticker(null)}
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
    {asset
      ? <AmanatSticker id={assetId} size={size} color={asset.defaultColors.color} accent={asset.defaultColors.accent} />
      : <Text style={[styles.emoji, { fontSize: size * 0.58 }]}>{sticker.emoji ?? "✦"}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  canvas: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 20 },
  deselectArea: { ...StyleSheet.absoluteFillObject },
  placedSticker: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
    backgroundColor: "transparent",
    borderRadius: 12,
  },
  emoji: { textAlign: "center" },
  control: {
    position: "absolute",
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: CONTROL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  remove: { top: -CONTROL_SIZE / 2, right: -CONTROL_SIZE / 2 },
  done: { top: -CONTROL_SIZE / 2, left: -CONTROL_SIZE / 2 },
  resize: { bottom: -CONTROL_SIZE / 2, right: -CONTROL_SIZE / 2 },
});

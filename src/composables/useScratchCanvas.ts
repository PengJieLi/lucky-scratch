import { onBeforeUnmount, onMounted, ref, watch, nextTick } from "vue";
import type { PlayType } from "../types/game";

type ScratchProps = {
    values: (string | number)[];
    revealedCells: number[];
    cellProgress: number[];
    playType: PlayType;
};
type ScratchEmit = {
    (event: "reveal", index: number): void;
    (event: "progress", index: number, value: number): void;
};

export function useScratchCanvas(
    props: ScratchProps,
    emit: ScratchEmit,
    scratchStartIndex: () => number,
    allRevealed: () => boolean,
    progress: () => number
) {
    const canvas = ref<HTMLCanvasElement | null>(null);
    let ctx: CanvasRenderingContext2D | null = null;
    let drawing = false;
    let lastPoint: { x: number; y: number } | null = null;

    function paint() {
        const el = canvas.value;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const dpr = window.devicePixelRatio || 1;
        el.width = Math.max(1, Math.floor(rect.width * dpr));
        el.height = Math.max(1, Math.floor(rect.height * dpr));
        ctx = el.getContext("2d");
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const { width: w, height: h } = rect;
        const gradient = ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, "#c5ccd9");
        gradient.addColorStop(0.22, "#f7f8fb");
        gradient.addColorStop(0.5, "#aeb8c9");
        gradient.addColorStop(0.78, "#eef0f5");
        gradient.addColorStop(1, "#9ba7ba");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = "#66738a";
        ctx.lineWidth = 1;
        for (let x = -h; x < w + h; x += 12) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + h, h);
            ctx.stroke();
        }
        ctx.restore();
        ctx.fillStyle = "#56647b";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "900 17px sans-serif";
        ctx.fillText("SCRATCH TO REVEAL", w / 2, h / 2 - 8);
        ctx.font = "600 10px sans-serif";
        ctx.fillText("刮开整张涂层，揭晓全部内容", w / 2, h / 2 + 14);
        const ratio = Math.min(0.98, progress());
        if (ratio > 0) {
            ctx.globalCompositeOperation = "destination-out";
            for (let i = 0, count = Math.floor(ratio * 150); i < count; i++) {
                const x = (((i * 67) % 997) / 997) * w;
                const y = (((i * 139) % 991) / 991) * h;
                ctx.beginPath();
                ctx.arc(x, y, 11, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalCompositeOperation = "source-over";
        }
        if (allRevealed() && props.values.length) ctx.clearRect(0, 0, w, h);
    }

    function erase(x: number, y: number) {
        if (!ctx) return;
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
    }

    function point(event: PointerEvent) {
        if (!canvas.value) return null;
        const rect = canvas.value.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }

    function down(event: PointerEvent) {
        if (allRevealed()) return;
        const position = point(event);
        if (!position) return;
        drawing = true;
        lastPoint = position;
        canvas.value?.setPointerCapture(event.pointerId);
        erase(position.x, position.y);
    }

    function move(event: PointerEvent) {
        if (!drawing || !ctx) return;
        const position = point(event);
        if (!position) return;
        if (lastPoint) {
            ctx.globalCompositeOperation = "destination-out";
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.lineWidth = 44;
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(position.x, position.y);
            ctx.stroke();
            ctx.globalCompositeOperation = "source-over";
        }
        erase(position.x, position.y);
        lastPoint = position;
    }

    function checkProgress() {
        const el = canvas.value;
        if (!el || !ctx) return;
        const data = ctx.getImageData(0, 0, el.width, el.height).data;
        let transparent = 0;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 40) transparent++;
        }
        const ratio = transparent / (data.length / 4);
        for (let i = scratchStartIndex(); i < props.values.length; i++) {
            emit("progress", i, ratio);
        }
        if (ratio >= 0.42) {
            for (let i = scratchStartIndex(); i < props.values.length; i++) {
                emit("reveal", i);
            }
        }
    }

    function up() {
        if (!drawing) return;
        drawing = false;
        lastPoint = null;
        checkProgress();
    }

    onMounted(async () => {
        await nextTick();
        paint();
        window.addEventListener("resize", paint);
    });
    onBeforeUnmount(() => window.removeEventListener("resize", paint));
    watch(
        () => [props.playType, props.values.join(","), props.revealedCells.join(","), props.cellProgress.join(",")],
        async () => {
            await nextTick();
            paint();
        }
    );

    return { canvas, down, move, up };
}

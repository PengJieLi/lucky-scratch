import type { PlayType } from "../types/game";

export const PLAY_TYPES: {
    id: PlayType;
    name: string;
    description: string;
    icon: string;
}[] = [
    {
        id: "number-match",
        name: "幸运数字",
        description: "对照中奖号码，匹配即可获得对应奖金",
        icon: "🔢"
    },
    {
        id: "symbol-match",
        name: "幸运图案",
        description: "6 个图案中集齐 3 个相同图案",
        icon: "🍀"
    },
    {
        id: "three-match",
        name: "三个相同",
        description: "刮开 3 个数字，寻找相同数字",
        icon: "🎯"
    },
    {
        id: "line-match",
        name: "连线大奖",
        description: "在 2 行图案中寻找横向连线",
        icon: "〰️"
    },
    {
        id: "number-compare",
        name: "数字比大小",
        description: "比较你的数字和幸运数字",
        icon: "⚖️"
    },
    {
        id: "number-sum",
        name: "数字求和",
        description: "两个数字相加等于目标和",
        icon: "➕"
    },
    {
        id: "direct-prize",
        name: "直接奖金",
        description: "刮开一个区域，直接揭晓奖金",
        icon: "💰"
    },
    {
        id: "coordinate",
        name: "幸运坐标",
        description: "在 3×3 坐标格中寻找大奖",
        icon: "🧭"
    },
    {
        id: "step-walk",
        name: "幸运步数",
        description: "沿着 5 个路径节点抵达终点",
        icon: "👣"
    }
];


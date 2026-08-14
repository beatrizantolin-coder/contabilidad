import type { Category, ID } from "../types";
import { T } from "../theme";
import { subcategoryColor } from "./color";

export interface CatInfo {
  name: string;
  color: string;
  catName: string;
  subName?: string;
  subsubName?: string;
}

export function catInfo(categories: Category[], categoryId: ID | null, subcategoryId?: ID | null, subsubcategoryId?: ID | null): CatInfo {
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return { name: "-", color: T.textFaint, catName: "-" };
  if (subcategoryId) {
    const sub = cat.subcategories.find((s) => s.id === subcategoryId);
    if (sub) {
      if (subsubcategoryId) {
        const subsub = sub.subcategories.find((s) => s.id === subsubcategoryId);
        if (subsub) return { name: cat.name + " / " + sub.name + " / " + subsub.name, color: subcategoryColor(cat.color), catName: cat.name, subName: sub.name, subsubName: subsub.name };
      }
      return { name: cat.name + " / " + sub.name, color: subcategoryColor(cat.color), catName: cat.name, subName: sub.name };
    }
  }
  return { name: cat.name, color: cat.color, catName: cat.name };
}

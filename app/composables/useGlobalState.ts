import type { Database } from "~/types/database.types";
type Category = Database["public"]["Tables"]["categories"]["Row"];

export const useGlobalBudget = () => useState<number>("budget", () => 0);
export const useGlobalCategories = () => useState<Category[]>("categories", () => []);

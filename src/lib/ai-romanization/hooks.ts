import { useMutation } from "@tanstack/react-query";
import { useSession } from "~/lib/auth-client";
import { romanizeText } from "./service";
import {
  type RomanizationRequest,
  type RomanizationResponse,
} from "~/types/romanization";

export const romanizationKeys = {
  all: ["romanization"] as const,
  romanize: (text: string, language: string) =>
    [...romanizationKeys.all, "romanize", text, language] as const,
};

export function useRomanizeText() {
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async (
      request: RomanizationRequest,
    ): Promise<RomanizationResponse> => {
      if (!session) {
        throw new Error("Authentication required");
      }
      return await romanizeText({ data: request });
    },
  });
}

import api from "../config/api";
import { API_ENDPOINTS } from "../config/api";
import { BatchMatch } from "../types";
import { message } from "antd";

export const submitBatchMatch = async (values: {
  environment_id: number;
  match_type_id: number;
  first_deck_id: number;
  second_deck_id: number;
  matches: BatchMatch[];
  ignore_first_player: boolean;
}): Promise<boolean> => {
  try {
    const {
      environment_id,
      match_type_id,
      first_deck_id,
      second_deck_id,
      matches,
      ignore_first_player,
    } = values;

    const matchResults = matches.map((match) => {
      const winning_deck_id =
        match.win === "first" ? first_deck_id : second_deck_id;
      const losing_deck_id =
        match.win === "first" ? second_deck_id : first_deck_id;
      
      const actual_first_deck_id = ignore_first_player ? 0 : match.first_player === "first" ? first_deck_id : second_deck_id;
      const actual_second_deck_id = ignore_first_player ? 0 : match.first_player === "first" ? second_deck_id : first_deck_id;
      
      return {
        environment_id,
        match_type_id,
        first_deck_id: actual_first_deck_id,
        second_deck_id: actual_second_deck_id,
        winning_deck_id,
        losing_deck_id,
      };
    });

    await api.post(`${API_ENDPOINTS.MATCH_RESULTS}batch`, {
      match_results: matchResults,
    });
    message.success("批量导入成功");
    return true;
  } catch (error) {
    message.error("批量导入失败");
    return false;
  }
}; 
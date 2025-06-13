import api, { API_ENDPOINTS } from "../config/api";
import { message } from "antd";
import { AxiosError } from "axios";

interface BatchMatch {
  first_player: "first" | "second";
  win: "first" | "second";
}

interface BatchSubmitValues {
  environment_id: number;
  match_type_id: number;
  first_deck_id: number;
  second_deck_id: number;
  matches: BatchMatch[];
  ignore_first_player: boolean;
}

export const handleBatchSubmit = async (values: BatchSubmitValues) => {
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
    console.error('批量导入失败:', error);
    
    try {
      if (error instanceof AxiosError && error.response?.data) {
        const errorData = error.response.data;
        let errorMessage = "批量导入失败";

        if (typeof errorData === 'string') {
          errorMessage = errorData;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.non_field_errors) {
          errorMessage = errorData.non_field_errors[0];
        } else {
          // 处理字段错误
          const fieldErrors = Object.entries(errorData)
            .map(([field, errors]) => {
              try {
                if (Array.isArray(errors)) {
                  return `${field}: ${errors[0]}`;
                } else if (typeof errors === 'object' && errors !== null) {
                  // 处理嵌套的错误对象
                  if ('msg' in errors) {
                    return `${field}: ${errors.msg}`;
                  }
                  return `${field}: ${JSON.stringify(errors)}`;
                }
                return `${field}: ${String(errors)}`;
              } catch (e) {
                console.error('处理错误信息失败:', e);
                return `${field}: 未知错误`;
              }
            })
            .filter(Boolean)
            .join('\n');
          errorMessage = fieldErrors || "批量导入失败";
        }

        message.error(errorMessage);
      } else {
        message.error("批量导入失败，请稍后重试");
      }
    } catch (e) {
      console.error('处理错误失败:', e);
      message.error("批量导入失败，请稍后重试");
    }
    return false;
  }
}; 
// 공통 API 응답 모델
export class ApiResponse {
    constructor(success, code, message, data = null) {
      this.success = success;
      this.code = code;
      this.message = message;
      this.data = data;
    }
  
    static fromJson(json) {
      return new ApiResponse(
        json.success,
        json.code,
        json.message,
        json.data
      );
    }
  
    isSuccess() {
      return this.success === true;
    }
  
    getData() {
      return this.data;
    }
  
    getMessage() {
      return this.message;
    }
  
    getCode() {
      return this.code;
    }
  }
  
  // API 응답 처리를 위한 유틸리티 함수 (axios 응답용)
  export const handleApiResponse = (response) => {
    // axios 응답에서 data 필드 추출
    const responseData = response.data;
    
    if (!responseData) {
      throw new Error('응답 데이터가 없습니다.');
    }
    
    const apiResponse = ApiResponse.fromJson(responseData);
    
    if (!apiResponse.isSuccess()) {
      throw new Error(apiResponse.getMessage() || `API 요청 실패: ${apiResponse.getCode()}`);
    }
    
    return apiResponse;
  };
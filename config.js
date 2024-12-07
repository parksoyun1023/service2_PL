var OPENWEATHERMAP_API_KEY = 'adb67de4a557753e101c9a33b531a4d6';
var KAKAO_APP_KEY = '52c37dc8679ac1f1f4eddf0e79ce88c7';
var OPENAI_API_KEY = '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';
var KAKAO_PLACES_API_KEY = 'c456beb0e065df1322ec57cbb146f2e8';

// Kakao Maps SDK 스크립트를 동적으로 추가합니다.
var kakaoScript = document.createElement('script');
kakaoScript.type = 'text/javascript';
kakaoScript.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services`;
document.head.appendChild(kakaoScript);
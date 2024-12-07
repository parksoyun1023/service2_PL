const chatbotName = 'PL';
const chatMessages = document.querySelector('#chat-messages'); // 수정된 부분
const userInput = document.querySelector('#user-input');
const sendButton = document.querySelector('#user-input + button'); // 수정된 부분
const apiKey = OPENAI_API_KEY; // OpenAI API 키
const apiEndpoint = 'https://api.openai.com/v1/chat/completions';

const weatherApiKey = OPENWEATHERMAP_API_KEY; // OpenWeatherMap API 키
const weatherApiEndpoint = 'https://api.openweathermap.org/data/2.5/weather';
const geocodingApiEndpoint = 'https://nominatim.openstreetmap.org/reverse'; // 역지오코딩 API 엔드포인트

const kakaoPlacesApiKey = KAKAO_PLACES_API_KEY; // 카카오 Places API 키 추가
const kakaoPlacesApiEndpoint = 'https://dapi.kakao.com/v2/local/search/keyword.json'; // 카카오 Places API 엔드포인트

// 장소 유형에 따른 카테고리 그룹 코드 매핑
const categoryGroupCodes = {
    tourist_attraction: 'AT4', // 관광명소
    restaurant: 'FD6',          // 음식점
    cafe: 'CE7',                // 카페
    lodging: 'AD5',             // 숙박
    parking: 'PM9',             // 주차장
    hospital: 'HP8',            // 병원
    pharmacy: 'PM2'             // 약국
};

// 채팅 메시지를 화면에 추가하는 함수
function addMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.textContent = `${sender}: ${message}`;
    chatMessages.append(messageElement);
}

// 사용자의 위치를 가져오는 함수
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => resolve(position),
                error => reject(error)
            );
        } else {
            reject('Geolocation is not supported by this browser.');
        }
    });
}

async function getDetailedAddress(lat, lon) {
    const url = `${geocodingApiEndpoint}?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=ko`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.address) {
            const { state, city, town, village, suburb, neighborhood, road } = data.address;
            return `${state || ''} ${city || ''} ${town || ''} ${village || ''} ${suburb || ''} ${neighborhood || ''} ${road || ''}`.trim();
        } else {
            return '알 수 없는 위치';
        }
    } catch (error) {
        console.error('역지오코딩 API 호출 오류:', error);
        return '주소를 가져오는 중 오류가 발생했습니다.';
    }
}

// 날씨 데이터를 가져오는 함수
async function getWeather(city, lat, lon) {
    let url;
    if (city) {
        // 도시 이름을 입력받았다면 도시 이름으로 날씨 조회
        url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${weatherApiKey}&units=metric&lang=kr`;
    } else {
        // 위치 기반으로 날씨 조회
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric&lang=kr`;
    }
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod === 200) {
            let location = `${data.name}, ${data.sys.country}`;
            if (!city) {
                // 상세 주소 가져오기
                location = await getDetailedAddress(lat, lon);
            }
            return `${location}의 현재 날씨는 '${data.weather[0].description}'이며, 기온은 ${Math.round(data.main.temp)}°C입니다.`;
        } else {
            return `${city || '현재 위치'}의 날씨 정보를 가져올 수 없습니다.`;
        }
    } catch (error) {
        console.error('날씨 API 호출 오류:', error);
        return '날씨 정보를 가져오는 중 오류가 발생했습니다.';
    }
}
// 주변 장소를 가져오는 함수
async function getNearbyPlaces(lat, lon, type) {
    const categoryCode = categoryGroupCodes[type]; // 카테고리 코드 가져오기
    if (!categoryCode) {
        console.error(`유효하지 않은 카테고리 타입: ${type}`);
        return '추천할 장소를 선택하지 않았습니다.';
    }

    // 카카오 API 호출 URL
    const url = `${kakaoPlacesApiEndpoint}?x=${lon}&y=${lat}&radius=1500&category_group_code=${categoryCode}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `KakaoAK ${kakaoPlacesApiKey}` // 인증 헤더
            }
        });

        if (!response.ok) {
            console.error(`카카오 API 호출 실패: ${response.status}`);
            return '장소 정보를 가져오는 중 오류가 발생했습니다.';
        }

        const data = await response.json();

        // 응답 데이터에서 장소 정보 추출
        if (data.documents && data.documents.length > 0) {
            const placeList = data.documents.map(place => `${place.place_name} (${place.distance}m)`);
            return placeList.join(', '); // 장소 이름과 거리 반환
        } else {
            return '추천할 장소를 찾을 수 없습니다.';
        }
    } catch (error) {
        console.error('카카오 장소 API 호출 오류:', error);
        return '장소 정보를 가져오는 중 오류가 발생했습니다.';
    }
}

// 사용자 입력에 따라 추천 장소 요청 처리
async function handleCustomQuestions(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('추천 여행지') || lowerMessage.includes('음식점') || lowerMessage.includes('카페') || lowerMessage.includes('숙소') || lowerMessage.includes('주차장') || lowerMessage.includes('병원') || lowerMessage.includes('약국')) {
        try {
            const position = await getUserLocation();
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            const types = [];

            // 메시지 내용에 따라 필요한 타입 추가
            if (lowerMessage.includes('여행지')) types.push('tourist_attraction');
            if (lowerMessage.includes('음식점')) types.push('restaurant');
            if (lowerMessage.includes('카페')) types.push('cafe');
            if (lowerMessage.includes('숙소')) types.push('lodging');
            if (lowerMessage.includes('주차장')) types.push('parking');
            if (lowerMessage.includes('병원')) types.push('hospital');
            if (lowerMessage.includes('약국')) types.push('pharmacy');

            let recommendations = [];
            for (const type of types) {
                const places = await getNearbyPlaces(lat, lon, type);
                const categoryCode = categoryGroupCodes[type];
                const placeType = getPlaceType(categoryCode); // 카테고리명을 한글로 변환
                recommendations.push(`${placeType}: ${places}`);
            }

            return recommendations.length > 0
                ? `주변 추천 장소:\n${recommendations.join('\n')}`
                : '추천할 장소가 없습니다.';
        } catch (error) {
            console.error('장소 추천 처리 중 오류:', error);
            return '추천 장소 정보를 가져오는 중 오류가 발생했습니다.';
        }
    }

    return null; // 다른 질문의 경우 기본 처리로 이동
}

// 의상 추천 함수 (온도에 따라 적���한 의��을 추천)
function getClothing(temp) {
    const recommendations = [
        { minTemp: 30, clothing: "반팔 티셔츠, 반바지, 얇은 원피스" },
        { minTemp: 25, clothing: "얇은 셔츠, 반팔 티셔츠, 반바지 또는 면바지" },
        { minTemp: 20, clothing: "얇은 스웨터, 긴팔 셔츠, 청바지" },
        { minTemp: 15, clothing: "가디건, ���트, 얇은 재킷" },
        { minTemp: 10, clothing: "두꺼운 스웨터, 두꺼운 재킷, 코트" },
        { minTemp: 5, clothing: "패딩 점퍼, 두꺼운 코트, 목도리" },
        { minTemp: 0, clothing: "두꺼운 패딩, 털모자, 장갑" },
        { minTemp: -100, clothing: "방한복, 부츠, 귀마개" }
    ];

    let recommendation = "적절한 의상을 찾을 수 없습니다.";
    for (let i = 0; i < recommendations.length; i++) {
        if (temp >= recommendations[i].minTemp) {
            recommendation = recommendations[i].clothing;
            break;
        }
    }

    return recommendation.replace(/<img[^>]*>/g, ''); // <img> 태그를 제거
}

// 사용자 입력에 따라 커스텀 응답을 처리하는 함수
async function handleCustomQuestions(message) {
    const lowerMessage = message.toLowerCase(); // 소문자로 변환하여 처리
    if (lowerMessage.includes('위치')) {
        try {
            const position = await getUserLocation(); // 사용자 위치 가져오기
            const weatherResponse = await getWeather(null, position.coords.latitude, position.coords.longitude); // 현재 위치 기반으로 날씨 가져오기
            return `현재 위치는 ${await getDetailedAddress(position.coords.latitude, position.coords.longitude)}입니다. ${weatherResponse}`;
        } catch (error) {
            return `현재 위치를 가져오는 데 실패했습니다: ${error.message}`;
        }
    }

    if (lowerMessage.includes('날씨')) {
        try {
            const position = await getUserLocation(); // 사용자 위치 가져오기
            const weatherResponse = await getWeather(null, position.coords.latitude, position.coords.longitude); // 현재 위치 기반으로 날씨 가져오기
            return `${weatherResponse}`;
        } catch (error) {
            return `날씨 정보를 가져오는 데 실패했습니다: ${error.message}`;
        }
    }

    if (lowerMessage.includes('추천 의상') || lowerMessage.includes('옷')) {
        try {
            const position = await getUserLocation(); // 사용자 위치 가져오기
            const weatherResponse = await getWeather(null, position.coords.latitude, position.coords.longitude); // 현재 위치 기반으로 날씨 가져오기
            const temp = weatherResponse.match(/기온은 (-?\d+)°C/);
            if (temp) {
                const clothingOption = getClothing(parseInt(temp[1]));
                return `${weatherResponse} 추천 의상: ${clothingOption}`;
            }
            return weatherResponse;
        } catch (error) {
            return `날씨 정보를 가져오는 데 실패했습니다: ${error.message}`;
        }
    }

    if (lowerMessage.includes('추천 여행지') || lowerMessage.includes('음식점') || lowerMessage.includes('카페') || lowerMessage.includes('숙소') || lowerMessage.includes('주차장') || lowerMessage.includes('병원') || lowerMessage.includes('약국')) {
        try {
            const position = await getUserLocation(); // 사용자 위치 가져오기
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            let types = [];
            
            if (lowerMessage.includes('여행지')) types.push('AT4');
            if (lowerMessage.includes('음식점')) types.push('FD6');
            if (lowerMessage.includes('카페')) types.push('CE7');
            if (lowerMessage.includes('숙소')) types.push('AD5');
            if (lowerMessage.includes('주차장')) types.push('PK6');
            if (lowerMessage.includes('병원')) types.push('HP8');
            if (lowerMessage.includes('약국')) types.push('PM9');
            
            console.log(`Detected types: ${types.join(', ')}`); // 추가 로그
            
            let recommendations = [];
            for (let type of types) {
                const places = await getNearbyPlaces(lat, lon, type);
                const placeType = getPlaceType(type); // 한글 카테고리명으로 변환
                recommendations.push(`${placeType}: ${places}`);
            }
            
            console.log(`Recommendations: ${recommendations.join('\n')}`); // 로그 추가
            return `주변 추천 장소:\n${recommendations.join('\n')}`;
        } catch (error) {
            console.error('handleCustomQuestions 오류:', error); // 로그 추가
            return `추천 장소 정보를 가져오는 데 실패했습니다: ${error.message}`;
        }
    }

    return null;
}

function getPlaceType(categoryCode) {
    switch(categoryCode) {
        case 'AT4':
            return '관광명소';
        case 'FD6':
            return '음식점';
        case 'CE7':
            return '카페';
        case 'AD5':
            return '숙박';
        case 'PM9':
            return '주차장';
        case 'HP8':
            return '병원';
        case 'PM2':
            return '약국';
        default:
            return '기타';
    }
}

// 단일 카테고리 테스트 함수 추가

// 단    카테고리 테스트 함수
async function testSingleCategory(type) {
    const lat = 37.5665; // 예시 위도 (서울)
    const lon = 126.9780; // 예시 경도 (서울)
    const places = await getNearbyPlaces(lat, lon, type);
    console.log(`Test - Type: ${type}, Places: ${places}`);
}

// 예시 실행
// 아래 주석을 해제하여 테스트 실행
// testSingleCategory('restaurant');
// testSingleCategory('cafe');
// testSingleCategory('parking');

// OpenAI API를 호출하여 AI 응답을 가져오는 함수
async function fetchAIResponse(prompt) {
    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
            max_tokens: 1024,
            top_p: 1,
            frequency_penalty: 0.5,
            presence_penalty: 0.5
        }),
    };
    try {
        const response = await fetch(apiEndpoint, requestOptions);
        const data = await response.json();
        let aiResponse = data.choices[0].message.content;

        // 이미지 태그는 유지하고, 필요한 경우 다른 처리를 추가
        aiResponse = aiResponse.replace(/<some-other-tag[^>]*>/g, ''); // 특정 태그를 제거하고 싶다면 추가

        return aiResponse;
    } catch (error) {
        console.error('OpenAI API 호출 중 오류 발생:', error);
        return 'OpenAI API 호출 중 오류가 발생했습니다.';
    }
}

function sendMessage() {
    const message = userInput.value.trim();
    if (message.length === 0) return;

    addMessage('나', message);
    userInput.value = '';

    // 커스텀 질문 처리
    handleCustomQuestions(message).then(customResponse => {
        if (customResponse) {
            addMessage(chatbotName, customResponse);
        } else {
            // OpenAI API 호출
            fetchAIResponse(message).then(aiResponse => {
                addMessage(chatbotName, aiResponse);
            });
        }
    });
}

// 전송 버튼 클릭 이벤트 처리
sendButton.addEventListener('click', async () => {
    const message = userInput.value.trim();
    if (message.length === 0) return;

    addMessage('나', message);
    userInput.value = '';

    // 커스텀 질문 처리
    const customResponse = await handleCustomQuestions(message);
    if (customResponse) {
        addMessage(chatbotName, customResponse);
        return;
    }

    // OpenAI API 호출
    const aiResponse = await fetchAIResponse(message);
    addMessage(chatbotName, aiResponse);
});

// 엔터 키 입력 이벤트 처리
userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        sendButton.click();
    }
});
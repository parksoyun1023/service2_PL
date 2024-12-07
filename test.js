var placeOverlay = new kakao.maps.CustomOverlay({ zIndex: 1 }),
    contentNode = document.createElement('div'),
    markers = [],
    currCategory = [],
    userLocation,
    allPlaces = [];

// 카테고리별 이미지 매핑
var categoryImages = {
    'AT4': 'a.png', 'FD6': 'b.png', 'CE7': 'c.png', 'AD5': 'd.png',
    'PK6': 'e.png', 'HP8': 'r.png', 'PM9': 'f.png'
};

// 지도 생성 및 설정
var mapContainer = document.getElementById('map'),
    mapOption = { center: new kakao.maps.LatLng(37.566826, 126.9786567), level: 5 },
    map = new kakao.maps.Map(mapContainer, mapOption),
    ps = new kakao.maps.services.Places(map);

kakao.maps.event.addListener(map, 'idle', searchPlaces);
contentNode.className = 'placeinfo_wrap';
addEventHandle(contentNode, 'mousedown', kakao.maps.event.preventMap);
addEventHandle(contentNode, 'touchstart', kakao.maps.event.preventMap);
placeOverlay.setContent(contentNode);
addCategoryClickEvent();

// 로드뷰 관련 변수 선언
var rvContainer = document.getElementById('roadview'); // 로드뷰를 표시할 div
var roadview = new kakao.maps.Roadview(rvContainer); // 로드뷰 객체
var roadviewClient = new kakao.maps.RoadviewClient(); // 로드뷰 helper 객체

// 마커 이미지를 생성합니다.
var markImage = new kakao.maps.MarkerImage(
    'https://t1.daumcdn.net/localimg/localimages/07/2018/pc/roadview_minimap_wk_2018.png',
    new kakao.maps.Size(26, 46),
    {
        // 스프라이트 이미지를 사용합니다.
        // 스프라이트 이미지 전체의 크기를 지정하고
        spriteSize: new kakao.maps.Size(1666, 168),
        // 사용하고 싶은 영역의 좌상단 좌표를 입력합니다.
        // background-position으로 지정하는 값이며 부호는 반대입니다.
        spriteOrigin: new kakao.maps.Point(705, 114),
        offset: new kakao.maps.Point(13, 46)
    }
);

// 드래그가 가능한 마커를 선언 (초기 위치 미정)
var rvMarker;

var markersVisible = true;

function toggleMarkers() {
    markersVisible = !markersVisible;
    markers.forEach(marker => {
        if (markersVisible) {
            marker.setMap(map);
        } else {
            marker.setMap(null);
        }
    });
}

function addEventHandle(target, type, callback) {
    target.addEventListener ? target.addEventListener(type, callback) : target.attachEvent('on' + type, callback);
}

function searchPlaces() {
    if (!currCategory.length) return removeMarker();
    placeOverlay.setMap(null);
    removeMarker();
    allPlaces = [];
    currCategory.forEach(category => ps.categorySearch(category, placesSearchCB, { useMapBounds: true }));
}

function placesSearchCB(data, status) {
    if (status === kakao.maps.services.Status.OK) {
        allPlaces = allPlaces.concat(data);
        displayPlaces(allPlaces);
    }
}

var selectedMarker = null;

// 새로운 함수 추가: 사이드바의 '로드뷰' 버튼 클릭 시 호출
function openRoadviewForPlace(placeId) {
    // 해당 장소의 마커 찾기
    var marker = markers.find(m => m.placeId === placeId);
    if (marker) {
        // 이전에 선택된 마커가 있으면 원래 크기로 복원
        if (selectedMarker && selectedMarker !== marker) {
            selectedMarker.setImage(new kakao.maps.MarkerImage(
                categoryImages[selectedMarker.category] || 'default.png',
                new kakao.maps.Size(25, 25)
            ));
        }

        // 현재 마커 크기 증가
        marker.setImage(new kakao.maps.MarkerImage(
            categoryImages[marker.category] || 'default.png',
            new kakao.maps.Size(35, 35)
        ));
        selectedMarker = marker;

        // 지도 중심 이동
        var position = marker.getPosition();
        map.setCenter(position);

        // 장소 정보 표시
        displayPlaceInfo(marker.place);
        displayDistanceFromCurrentLocation(marker.place);

        // 로드뷰 이동 및 표시
        rvMarker.setPosition(position);
        toggleRoadview(position);
    }
}

function displayPlaces(places) {
    removeMarker();
    clearSidebar();
    if (userLocation) {
        places.forEach(place => place.distance = calculateDistance(userLocation.getLat(), userLocation.getLng(), place.y, place.x));
        places.sort((a, b) => a.distance - b.distance);
    }
    places.forEach(place => {
        var marker = addMarker(new kakao.maps.LatLng(place.y, place.x), place.category_group_code, place);
        addPlaceToSidebar(place);
        kakao.maps.event.addListener(marker, 'click', () => {
            displayPlaceInfo(place);
            displayDistanceFromCurrentLocation(place);
            rvMarker.setPosition(new kakao.maps.LatLng(place.y, place.x)); // 드래그 마커 이동
            toggleRoadview(new kakao.maps.LatLng(place.y, place.x)); // 로드뷰 따라가기 추가

            if (selectedMarker) {
                // 이전 마커 크기 원래대로 복원
                selectedMarker.setImage(new kakao.maps.MarkerImage(
                    categoryImages[selectedMarker.category] || 'default.png',
                    new kakao.maps.Size(25, 25)
                ));
            }

            // 현재 마커 크기 증가 및 이미지 변경
            marker.setImage(new kakao.maps.MarkerImage(
                categoryImages[place.category_group_code].replace('.png', '_click.png') || 'default_click.png',
                new kakao.maps.Size(35, 35)
            ));
            selectedMarker = marker;
        });
    });
}

function addMarker(position, category, place) {
    var marker = new kakao.maps.Marker({
        position: position,
        image: new kakao.maps.MarkerImage(categoryImages[category] || 'default.png', new kakao.maps.Size(25, 25)),
        map: map
    });
    marker.category = category; // 마커 카테고리 저장
    marker.placeId = place.id; // 장소 ID 저장
    marker.place = place; // 장소 객체 저장
    markers.push(marker);
    return marker;
}

function removeMarker() {
    markers.forEach(marker => marker.setMap(null));
    markers = [];
}

function displayPlaceInfo(place) {
    var content = `<div class="placeinfo">
        <a class="title" href="${place.place_url}" target="_blank" title="${place.place_name}">${place.place_name}</a>
        <span title="${place.road_address_name || place.address_name}">${place.road_address_name || place.address_name}</span>
        ${place.road_address_name ? `<span class="jibun" title="${place.address_name}">(지번 : ${place.address_name})</span>` : ''}
        <span class="tel">${place.phone || '전화번호 없음'}</span>
        </div><div class="after"></div>`;
    contentNode.innerHTML = content;
    placeOverlay.setPosition(new kakao.maps.LatLng(place.y, place.x));
    placeOverlay.setMap(map);
}

function displayDistanceFromCurrentLocation(place) {
    if (userLocation) {
        var distance = calculateDistance(userLocation.getLat(), userLocation.getLng(), place.y, place.x);
        contentNode.innerHTML += `<div class="distance">거리: ${distance.toFixed(2)} km</div>`;
    }
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    var R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function addCategoryClickEvent() {
    Array.from(document.getElementById('category').children).forEach(child => child.onclick = onClickCategory);
}

function onClickCategory() {
    var id = this.id, className = this.className;
    placeOverlay.setMap(null);
    if (className === 'on') {
        currCategory = currCategory.filter(category => category !== id);
    } else {
        currCategory.push(id);
    }
    changeCategoryClass();
    searchPlaces();
}

function changeCategoryClass() {
    Array.from(document.getElementById('category').children).forEach(child => child.className = '');
    currCategory.forEach(id => document.getElementById(id).className = 'on');
}

function addPlaceToSidebar(place) {
    var sidebar = document.getElementById('sidebar');
    var li = document.createElement('li');
    li.className = 'sidebar-place';
    var distance = userLocation ? calculateDistance(userLocation.getLat(), userLocation.getLng(), place.y, place.x) : null;
    var distanceText = distance ? `내 위치로부터 ${distance.toFixed(2)} km` : '';
    var placeType = getPlaceType(place.category_group_code);
    li.innerHTML = `<a href="#" onclick="openInSidebar('${place.place_url}', '${place.place_name}')">
        ${place.place_name}
        <span class="place-type">${placeType}</span><br>
        <span class="distance-text">${distanceText}</span>
    </a>
    <button class="roadview-button" onclick="openRoadviewForPlace('${place.id}')">로드뷰</button>
    <button class="review-button" onclick="window.open('${place.place_url}', '_blank')">리뷰</button>`;
    sidebar.appendChild(li);
}

function getPlaceType(category) {
    switch (category) {
        case 'CE7': return '카페';
        case 'AD5': return '숙소';
        case 'AT4': return '주변여행지';
        case 'PK6': return '주차장';
        case 'HP8': return '병원';
        case 'PM9': return '약국';
        case 'FD6': return '음식점';
        default: return '기타';
    }
}

function openInSidebar(url, name) {
    window.open(url, '_blank');
    fetchNaverReviews(name);
}

function clearSidebar() {
    document.getElementById('sidebar').innerHTML = '';
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            userLocation = new kakao.maps.LatLng(position.coords.latitude, position.coords.longitude);
            map.setCenter(userLocation);
            new kakao.maps.Marker({ position: userLocation, map: map });
            
            // 드래그 가능한 마커 생성 (초기에는 지도에 추가하지 않음)
            rvMarker = new kakao.maps.Marker({
                image: markImage,
                position: userLocation,
                draggable: true
                // map: map 제거
            });
            
            // 마커에 dragend 이벤트 할당
            kakao.maps.event.addListener(rvMarker, 'dragend', function() {
                var position = rvMarker.getPosition();
                toggleRoadview(position);
            });
            
            // 지도에 클릭 이벤트 할당
            kakao.maps.event.addListener(map, 'click', function(mouseEvent) {
                var position = mouseEvent.latLng;
                rvMarker.setPosition(position);
                toggleRoadview(position);
            });
            
            document.getElementById("currentLocationImage").onclick = () => map.setCenter(userLocation);
            fetchWeather(position.coords.latitude, position.coords.longitude);
        }, error => console.error("현재 위치를 가져올 수 없습니다.", error));
    } else {
        var locPosition = new kakao.maps.LatLng(33.450701, 126.570667);
        map.setCenter(locPosition);
        new kakao.maps.Marker({ position: locPosition, map: map });
        document.getElementById("currentLocationImage").onclick = () => map.setCenter(locPosition);
        fetchWeather(33.450701, 126.570667);
    }
}

getCurrentLocation();

// OpenWeatherMap API 키를 config.js에서 가져와 사용합니다.
function fetchWeather(lat, lon) {
    var url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHERMAP_API_KEY}&units=metric&lang=kr`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            var weatherDescription = data.weather[0].description;
            var temperature = Math.round(data.main.temp);
            var tempMin = Math.round(data.main.temp_min);
            var tempMax = Math.round(data.main.temp_max);
            var locationName = data.name;
            var geocoder = new kakao.maps.services.Geocoder();
            geocoder.coord2RegionCode(lon, lat, (result, status) => {
                if (status === kakao.maps.services.Status.OK) {
                    var regionName = result[0].address_name;
                    var clothingRecommendation = getClothingRecommendation(temperature);
                    document.getElementById("weatherInfo").innerHTML = `
                        <strong class="region-name">${regionName}</strong>
                        <strong class="temper">현재 날씨 ${temperature}°C</strong><br>
                        <div class="max-min">최고 ${tempMax}°C |  최저 ${tempMin}°C</div>
                        <strong class="clothingRecommendation">추천 의상: ${clothingRecommendation}</strong>`;
                }
            });
        })
        .catch(error => console.error("날씨 정보를 가져올 수 없습니다.", error));
}

const clothingRecommendations = [
    { minTemp: 30, clothing: "반팔 티셔츠, 반바지, 얇은 원피스" },
    { minTemp: 25, clothing: "얇은 셔츠, 반팔 티셔츠, 반바지 또는 면바지" },
    { minTemp: 20, clothing: "얇은 스웨터, 긴팔 셔츠, 청바지" },
    { minTemp: 15, clothing: "가디건, 니트, 얇은 재킷" },
    { minTemp: 10, clothing: "두꺼운 스웨터, 두꺼운 재킷, 코트" },
    { minTemp: 5, clothing: "패딩 점퍼, 두꺼운 코트, 목도리" },
    { minTemp: 0, clothing: "두꺼운 패딩, 털모자, 장갑", icons: [
        "./free-icon-winter-clothes-9752758.png", 
        "./free-icon-winter-hat-616046.png", 
        "./free-icon-gloves-3784886.png"
    ]},
    { minTemp: -100, clothing: "방한복, 털부츠, 귀마개" }
];

function getClothingRecommendation(temp) {
    for (const recommendation of clothingRecommendations) {
        if (temp >= recommendation.minTemp) {
            if (recommendation.icons) {
                const iconsHtml = recommendation.icons.map(icon => `<img src="${icon}" alt="icon" class="weather-icon">`).join(' ');
                return `${recommendation.clothing} ${iconsHtml}`;
            }
            return recommendation.clothing;
        }
    }
    return "적절한 의상 정보가 없습니다.";
}

function showClothingRecommendation(temperature) {
    document.getElementById("clothingRecommendation").innerHTML = `<strong>추천 의상: </strong>${getClothingRecommendation(temperature)}`;
}

function setMapType(maptype) { 
    var roadmapControl = document.getElementById('btnRoadmap');
    var skyviewControl = document.getElementById('btnSkyview'); 
    if (maptype === 'roadmap') {
        map.setMapTypeId(kakao.maps.MapTypeId.ROADMAP);    
        roadmapControl.className = 'selected_btn';
        skyviewControl.className = 'btn';
    } else {
        map.setMapTypeId(kakao.maps.MapTypeId.HYBRID);    
        skyviewControl.className = 'selected_btn';
        roadmapControl.className = 'btn';
    }
}

function zoomIn() {
    map.setLevel(map.getLevel() - 1);
}

function zoomOut() {
    map.setLevel(map.getLevel() + 1);
}

var currentTypeId;

function setOverlayMapTypeId(maptype) {
    var changeMaptype = maptype === 'traffic' ? kakao.maps.MapTypeId.TRAFFIC : kakao.maps.MapTypeId.ROADVIEW;
    if (currentTypeId === changeMaptype) {
        map.removeOverlayMapTypeId(currentTypeId);
        currentTypeId = null;
    } else {
        if (currentTypeId) map.removeOverlayMapTypeId(currentTypeId);
        map.addOverlayMapTypeId(changeMaptype);
        currentTypeId = changeMaptype;
    }
}

// 로드뷰 toggle 함수 수정: position 파라미터 추가
function toggleRoadview(position) {
    roadviewClient.getNearestPanoId(position, 50, function(panoId) {
        if (panoId) {
            rvContainer.style.display = 'block';
            roadview.setPanoId(panoId, position);
            // 지도 크기 조정 제거
            // mapContainer.style.height = '70%'; // 제거
            // rvContainer.style.height = '30%'; // 제거

            // 로드뷰 위치 및 크기 설정
            rvContainer.style.position = 'absolute';
            rvContainer.style.width = '30%'; // 원하는 너비로 설정
            rvContainer.style.height = '30%'; // 원하는 높이로 설정
            rvContainer.style.top = '47%'; // 지도 위의 위치 조정
            rvContainer.style.right = '10px'; // 지도 오른쪽에 위치
            rvContainer.style.zIndex = '5'; // 지도보다 높은 z-index 설정
            map.relayout();
            roadview.relayout();
        } else {
            rvContainer.style.display = 'none';
            // 지도 크기 복원 제거
            // mapContainer.style.height = '100%'; // 제거
            map.relayout();
            // ...existing code...
        }
    });
}

function toggleRoadviewButton() {
    if (rvContainer.style.display === 'block') {
        rvContainer.style.display = 'none';
        // 지도 크기 복원 제거
        // mapContainer.style.height = '100%'; // 제거
        rvMarker.setMap(null); // 드래그 마커 숨기기
        map.relayout();
        roadview.relayout();
    } else {
        if (userLocation) {
            toggleRoadview(userLocation);
            rvMarker.setMap(map); // 드래그 마커 표시
        }
    }
}

// ...existing code...

async function getNearbyPlaces(lat, lon, type) {
    const categoryCode = type; // 카테고리 코드 직접 사용
    if (!categoryCode) {
        console.error(`유효하지 않은 카테고리 타입: ${type}`);
        return '추천할 장소를 선택하지 않았습니다.';
    }

    const url = `${kakaoPlacesApiEndpoint}?x=${lon}&y=${lat}&radius=1500&category_group_code=${categoryCode}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `KakaoAK ${KAKAO_PLACES_API_KEY}`
            }
        });

        if (!response.ok) {
            console.error(`카카오 API 호출 실패: ${response.status}`);
            return '장소 정보를 가져오는 중 오류가 발생했습니다.';
        }

        const data = await response.json();

        if (data.documents && data.documents.length > 0) {
            const placeList = data.documents.map(place => {
                const distance = calculateDistance(lat, lon, place.y, place.x).toFixed(2);
                return `${place.place_name} (${distance} km)`;
            });
            return placeList.join(', ');
        } else {
            return '추천할 장소를 찾을 수 없습니다.';
        }
    } catch (error) {
        console.error('카카오 장소 API 호출 오류:', error);
        return '장소 정보를 가져오는 중 오류가 발생했습니다.';
    }
}

// ...existing code...
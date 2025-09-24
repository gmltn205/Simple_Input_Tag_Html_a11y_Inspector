function validateMarkup(code) {
    let issues = [];
    let parser = new DOMParser();
    let doc = parser.parseFromString(`<div>${code}</div>`, 'text/html');
    
    // ID 중복 체크
    let elements = doc.querySelectorAll('[id]');
    let ids = [];
    elements.forEach(el => {
        let id = el.getAttribute('id');
        if (ids.includes(id)) {
            let dupLines = [];
            let regex = new RegExp(`id\\s*=\\s*["']${id}["']`, 'gi');
            let match;
            while ((match = regex.exec(code)) !== null) {
                let lineNum = code.substring(0, match.index).split('\n').length;
                dupLines.push(lineNum);
            }
            if (dupLines.length > 1) {
                issues.push(`${dupLines.join(', ')}번째 줄에서 ID "${id}"가 중복 사용되었습니다. → 각 ID는 페이지에서 유일해야 합니다.`);
            }
        } else {
            ids.push(id);
        }
    });
    
    // 닫는 태그 검사가 필요 없는 태그들
    let voidElements = ['input', 'br', 'hr', 'img', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
    
    // 미완성 태그 검사 (< 다음에 >가 없는 경우)
    let lines = code.split('\n');
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        let line = lines[lineIndex];
        let lineNum = lineIndex + 1;
        
        // 각 줄에서 < 위치 찾기
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '<') {
                let tagStart = i;
                let tagEnd = line.indexOf('>', i);
                
                if (tagEnd === -1) {
                    // 같은 줄에 >가 없는 경우 - 다음 줄들에서 >를 찾아보기
                    let found = false;
                    for (let nextLine = lineIndex + 1; nextLine < lines.length; nextLine++) {
                        if (lines[nextLine].includes('>')) {
                            found = true;
                            break;
                        }
                        // 다른 <가 나오면 미완성 태그로 판단
                        if (lines[nextLine].includes('<')) {
                            break;
                        }
                    }
                    
                    if (!found) {
                        // 태그명 추출
                        let remainingText = line.substring(i + 1);
                        let tagNameMatch = remainingText.match(/^(\w+)/);
                        if (tagNameMatch) {
                            let tagName = tagNameMatch[1];
                            issues.push(`${lineNum}번째 줄의 &lt;${tagName}&gt; 태그가 올바르게 닫히지 않았습니다. → '&gt;'가 누락되었습니다.`);
                        }
                    }
                }
                
                // 다음 < 위치로 이동
                i = tagEnd !== -1 ? tagEnd : line.length;
            }
        }
    }
    
    // 스택 기반 태그 매칭 검사
    let tagStack = []; // {tagName, lineNum, position}
    
    // 모든 태그를 순서대로 찾기
    let tagRegex = /<\/?(\w+)(?:\s[^>]*)?>/g;
    let match;
    
    while ((match = tagRegex.exec(code)) !== null) {
        let fullMatch = match[0];
        let tagName = match[1].toLowerCase();
        let isClosing = fullMatch.startsWith('</');
        let position = match.index;
        let lineNum = code.substring(0, position).split('\n').length;
        
        if (voidElements.includes(tagName)) {
            continue; // void 요소는 스킵
        }
        
        if (!isClosing) {
            // 여는 태그
            tagStack.push({
                tagName: tagName,
                lineNum: lineNum,
                position: position
            });
        } else {
            // 닫는 태그
            if (tagStack.length === 0) {
                // 여는 태그 없이 닫는 태그만 있음
                issues.push(`${lineNum}번째 줄의 &lt;/${tagName}&gt; 태그에 대응하는 여는 태그가 없습니다.`);
            } else {
                let lastOpen = tagStack[tagStack.length - 1];
                
                if (lastOpen.tagName === tagName) {
                    // 올바른 매칭
                    tagStack.pop();
                } else {
                    // 태그 불일치 - 스택에서 같은 태그명을 찾아보기
                    let foundIndex = -1;
                    for (let i = tagStack.length - 1; i >= 0; i--) {
                        if (tagStack[i].tagName === tagName) {
                            foundIndex = i;
                            break;
                        }
                    }
                    
                    if (foundIndex !== -1) {
                        // 중간에 있는 태그들이 제대로 닫히지 않음
                        for (let i = tagStack.length - 1; i > foundIndex; i--) {
                            let unclosedTag = tagStack[i];
                            issues.push(`${unclosedTag.lineNum}번째 줄의 &lt;${unclosedTag.tagName}&gt; 태그가 닫히지 않았습니다. (${tagName} 태그가 먼저 닫힘)`);
                        }
                        // 해당 태그까지 스택에서 제거
                        tagStack.splice(foundIndex);
                    } else {
                        // 완전히 매칭되지 않는 닫는 태그
                        issues.push(`${lineNum}번째 줄의 &lt;/${tagName}&gt; 태그에 대응하는 여는 태그가 없습니다.`);
                    }
                }
            }
        }
    }
    
    // 아직 닫히지 않은 태그들
    for (let unclosedTag of tagStack) {
        issues.push(`${unclosedTag.lineNum}번째 줄의 &lt;${unclosedTag.tagName}&gt; 태그가 닫히지 않았습니다.`);
    }
    
    return issues;
}

function basic_check(input, doc, index, type) {
    let id = input.id;
    let issues = [];
    let compliant = [];
    
    // 1. 레이블 검사(설명)

    //직접 적인 설명
    let hasLabel = false;
    let hasAriaLabel = false;

    //다른 요소의 id값 매칭 여부 검사
    let hasAriaLabelledby = false;
    let hasAriaDescribedby = false;
    
    // 명시적 label 찾기 (for 속성)
    if (id) {
        let label = doc.querySelector(`label[for="${id}"]`);
        if (label) hasLabel = true;
    }
    
    let has_hint_label=false;

    // 암시적 label 찾기 (부모 요소)
    if (!hasLabel) {
        let parentLabel = input.closest('label');
        if (parentLabel) {
            hasLabel = true;
            has_hint_label=true;
        }
    }

    // 2. ID 검사
    if (!id) {
        if(!has_hint_label)
            issues.push("id 속성이 없습니다. → label과 연결하려면 id가 필요합니다.");
        else
            compliant.push("id 속성이 없지만, 암시적 label을 제공합니다.");
        
    } else {
        compliant.push("id 속성이 제공되었습니다.");
    }
    
    // ARIA 속성 검사
    let ariaLabel = input.getAttribute('aria-label');
    let ariaLabelledby = input.getAttribute('aria-labelledby');
    let ariaDescribedby = input.getAttribute('aria-describedby');
    
    if (ariaLabel && ariaLabel.trim()) hasAriaLabel = true;
    if (ariaLabelledby && ariaLabelledby.trim()) hasAriaLabelledby = true;
    if (ariaDescribedby && ariaDescribedby.trim()) hasAriaDescribedby = true;
    

    let all_des_have=false;

    //설명 기능 판정
    if (!hasLabel && !hasAriaLabel && !hasAriaLabelledby && !hasAriaDescribedby) {
        issues.push("설명을 제공하는 기능이 없습니다. → label, aria-label, aria-labelledby 및 aria-describedby 중 하나는 필수입니다.");
    } else {
        if (hasLabel) 
            compliant.push("label 태그가 올바르게 연결되었습니다.");
        
        if (hasAriaLabel) 
            compliant.push("aria-label이 제공되었습니다.");
        
        if (hasAriaLabelledby) 
            compliant.push("aria-labelledby가 제공되었습니다.");
        
        if(hasAriaDescribedby)
            compliant.push("aria-describedby로 추가 설명이 제공되었습니다.");
        all_des_have=true;
    }
    
    // 4. 필수 입력 검사
    let isRequired = input.hasAttribute('required');
    if (isRequired) {
        let ariaRequired = input.getAttribute('aria-required');
        if (ariaRequired !== 'true') {
            issues.push("필수 입력 필드에 aria-required=\"true\"가 누락되었습니다. → required와 함께 aria-required=\"true\" 추가가 필요합니다.");
        } else {
            compliant.push("필수 입력 표시가 올바르게 설정되었습니다.");
        }
    }
    
    // 5. title 검사 Label이 있다면 검사 x
    let titleStr = input.getAttribute('title');
    if ((!titleStr || !titleStr.trim()) && !all_des_have) {
        issues.push("title 속성이 없습니다. → 마우스 호버 시 도움말 제공을 위해 title 속성 추가를 권장합니다.");
    } else {
        compliant.push("title 속성이 제공되었습니다.");
    }
    
    // 6. 패턴 검사
    let isPattern = input.hasAttribute('pattern');
    if (isPattern) {
        let hasPlaceholder = input.hasAttribute('placeholder');
        if (!hasPlaceholder) {
            issues.push("패턴 속성에 대한 안내가 없습니다. → placeholder로 입력 형식을 안내해주세요.");
        } else {
            compliant.push("입력 패턴에 대한 안내가 제공되었습니다.");
        }
    }
    
    return { issues, compliant };
}
/* 패스워드 보이기, 안보이기 코드 접근성과는 관련없어 임시적 주석처리
function checkPassword(input) {
    
    let hasButton = false;
    let toggleInfo = "";
    let issues = [];
    let compliant = [];
    
    // 형제 요소에서 버튼 찾기
    let next_S = input.nextElementSibling;
    let prev_S = input.previousElementSibling;
    
    // 직접 형제 요소 검사
    if ((next_S && (next_S.tagName === 'BUTTON' || (next_S.tagName === 'INPUT' && next_S.type === 'button'))) ||
        (prev_S && (prev_S.tagName === 'BUTTON' || (prev_S.tagName === 'INPUT' && prev_S.type === 'button')))) {
        hasButton = true;
        
        let next_id = next_S && next_S.id ? next_S.id : '';
        let prev_id = prev_S && prev_S.id ? prev_S.id : '';
        
        let n_t = next_S ? (next_S.textContent?.trim() || next_S.querySelector('span')?.textContent?.trim() || '') : '';
        let p_t = prev_S ? (prev_S.textContent?.trim() || prev_S.querySelector('span')?.textContent?.trim() || '') : '';
        let text_temp = (n_t + ' ' + p_t).trim();
        
        if (next_id || prev_id) {
            toggleInfo = `발견된 버튼 ID: ${next_id} ${prev_id}`.trim();
        } else if (text_temp) {
            toggleInfo = `발견된 버튼 텍스트: ${text_temp}`;
        } else {
            toggleInfo = "버튼이 발견되었으나 식별 정보가 없습니다.";
        }
    }
    
    // 형제 요소 내부의 버튼 검사
    if (!hasButton && (next_S || prev_S)) {
        let next_temp = next_S ? next_S.querySelector('button, input[type="button"]') : null;
        let prev_temp = prev_S ? prev_S.querySelector('button, input[type="button"]') : null;
        
        if (next_temp || prev_temp) {
            hasButton = true;
            let next_id = next_temp ? next_temp.id : '';
            let prev_id = prev_temp ? prev_temp.id : '';
            
            let n_t = next_temp ? (next_temp.textContent?.trim() || next_temp.querySelector('span')?.textContent?.trim() || '') : '';
            let p_t = prev_temp ? (prev_temp.textContent?.trim() || prev_temp.querySelector('span')?.textContent?.trim() || '') : '';
            let text_temp = (n_t + ' ' + p_t).trim();
            
            if (next_id || prev_id) {
                toggleInfo = `내부 버튼 ID: ${next_id} ${prev_id}`.trim();
            } else if (text_temp) {
                toggleInfo = `내부 버튼 텍스트: ${text_temp}`;
            } else {
                toggleInfo = "내부에 버튼이 발견되었으나 식별 정보가 없습니다.";
            }
        }
    }
    
    // 결과 판정
    if (hasButton) {
        compliant.push(`비밀번호 표시/숨김 기능이 있습니다. (${toggleInfo})`);
        issues.push("비밀번호 토글 버튼에 적절한 aria-label이나 title이 있는지 확인해주세요.");
    } else {
        issues.push("비밀번호 표시/숨김 기능이 없습니다. → 접근성 향상을 위해 비밀번호 보기 토글 버튼 추가를 권장합니다.");
    }
    
    return { issues, compliant };
}
*/
function generateInputHTML(input, index, type, basicResult, lineNumber) {
    //기존 basic한 이슈 및 준수 내용 저장
    let allIssues = [...basicResult.issues];
    let allCompliant = [...basicResult.compliant];
    
    //id찾기
    let id = input.id || '(없음)';
    
    let statusColor = allIssues.length > 0 ? '#dc2626' : '#22c55e';
    let statusText = allIssues.length > 0 ? `${allIssues.length}개 수정 필요` : '모든 검사 통과';
    
    let html = `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; margin: 10px 0; background: white;">
            <div style="padding: 15px; background: #f8fafc; border-radius: 8px 8px 0 0; cursor: pointer; user-select: none;" 
                 onclick="toggleInputDetail(${index})">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>Input ${index}</strong>
                        <span style="color: #64748b; margin-left: 10px;">type="${type}" id="${id}"</span>
                        <span style="color: #7c3aed; margin-left: 10px; font-size: 12px; background: #f3f4f6; padding: 2px 6px; border-radius: 4px;">${lineNumber}번째 줄</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span>
                        <span id="toggle-icon-${index}" style="font-size: 12px; color: #64748b;">▼</span>
                    </div>
                </div>
            </div>
            
            <div id="input-detail-${index}" style="display: none; padding: 20px; border-top: 1px solid #e5e7eb;">
    `;
    
    // 수정 필요한 항목들
    if (allIssues.length > 0) {
        html += `
            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #dc2626; font-size: 14px;">🚨 수정 필요한 항목 (${allIssues.length}개)</h4>
                <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; border-radius: 4px;">
        `;
        allIssues.forEach(issue => {
            html += `<div style="color: #dc2626; margin: 5px 0;">• ${issue}</div>`;
        });
        html += `</div></div>`;
    }
    
    // 접근성 준수 항목들
    if (allCompliant.length > 0) {
        html += `
            <div>
                <h4 style="margin: 0 0 10px 0; color: #22c55e; font-size: 14px;">✅접근성 준수 항목 (${allCompliant.length}개)</h4>
                <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; border-radius: 4px;">
        `;
        allCompliant.forEach(item => {
            html += `<div style="color: #22c55e; margin: 5px 0;">• ${item}</div>`;
        });
        html += `</div></div>`;
    }
    
    html += `</div></div>`;
    
    return html;
}

//input 위치 찾기
function findInputLineNumber(code, input, inputIndex) {
    try {
        // input 태그의 고유 식별자를 만들어 위치를 찾습니다
        let id = input.id;
        let type = input.type || 'text';
        let className = input.className;
        
        // 정규식으로 input 태그들을 찾습니다
        let inputRegex = /<input[^>]*>/gi;
        let matches = [];
        let match;
        
        while ((match = inputRegex.exec(code)) !== null) {
            matches.push({
                match: match[0],
                index: match.index
            });
        }
        
        // 현재 input이 몇 번째 input인지 확인하고 해당 위치 반환
        if (matches[inputIndex]) {
            let lineNum = code.substring(0, matches[inputIndex].index).split('\n').length;
            return lineNum;
        }
        
        return '알 수 없음';
    } catch (error) {
        console.error('Input 위치 찾기 오류:', error);
        return '알 수 없음';
    }
}


//마크업 에러 html 코드 생성기
function generateMarkupErrorsHTML(markupErrors) {
    if (markupErrors.length === 0) return '';
    
    return `
        <div style="border: 1px solid #dc2626; border-radius: 8px; margin: 10px 0; background: white;">
            <div style="padding: 15px; background: #fef2f2; border-radius: 8px 8px 0 0; cursor: pointer; user-select: none;" 
                 onclick="toggleMarkupErrors()">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: #dc2626;">⚠️ 마크업 오류</strong>
                        <span style="color: #dc2626; font-weight: bold; margin-left: 10px;">${markupErrors.length}개 발견</span>
                    </div>
                    <span id="markup-toggle-icon" style="font-size: 12px; color: #64748b;">▼</span>
                </div>
            </div>
            
            <div id="markup-errors-detail" style="display: none; padding: 20px; border-top: 1px solid #e5e7eb;">
                <h4 style="margin: 0 0 10px 0; color: #dc2626; font-size: 14px;">🚨 즉시 수정 필요한 마크업 오류</h4>
                <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; border-radius: 4px;">
                    ${markupErrors.map(error => `<div style="color: #dc2626; margin: 5px 0;">• ${error}</div>`).join('')}
                </div>
            </div>
        </div>
    `;
}

//미리보기 html 코드 생성기
function showPreview() {
    let code = document.getElementById('input').value.trim();

    let previewHTML = `
        <div class="preview-container">
            <div class="preview-header">
                <h3 style="margin: 0; color: #1976d2;">📋 HTML 미리보기</h3>
                <p style="margin: 5px 0 0 0; color: #424242; font-size: 14px;">입력하신 HTML 코드의 실제 렌더링 결과입니다.</p>
            </div>
            ${code || '<p style="color: #666;">미리보기할 코드가 없습니다.</p>'}
        </div>
    `;
    
    return previewHTML;
}


//상세 정보 열고 닫기 메서드
function toggleInputDetail(index) {
    let detail = document.getElementById(`input-detail-${index}`);
    let icon = document.getElementById(`toggle-icon-${index}`);
    
    if (detail.style.display === 'none') {
        detail.style.display = 'block';
        icon.textContent = '▲';
    } else {
        detail.style.display = 'none';
        icon.textContent = '▼';
    }
}

//상세 마크업 오류 정보 열고 닫기 메서드
function toggleMarkupErrors() {
    let detail = document.getElementById('markup-errors-detail');
    let icon = document.getElementById('markup-toggle-icon');
    
    if (detail.style.display === 'none') {
        detail.style.display = 'block';
        icon.textContent = '▲';
    } else {
        detail.style.display = 'none';
        icon.textContent = '▼';
    }
}

//기본 함수 (html에서 호출)
function checkInputs() {
    // 코드만 가져옴
    let code = document.getElementById('input').value.trim();
    
    // 결과창
    let resultDiv = document.getElementById('result');
    resultDiv.style.display = 'block';
    
    //코드 없으면 리턴
    if (!code) {
        resultDiv.innerHTML = '<div style="padding: 20px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626;"><strong>❌ 코드를 입력해주세요.</strong></div>';
        return;
    }
    
    // 마크업 검증
    let markupErrors = validateMarkup(code);
    
    let parser = new DOMParser();
    let doc = parser.parseFromString(`<div>${code}</div>`, 'text/html');
    let inputs = doc.querySelectorAll('input');
    

    //input tag가 없는 경우
    if (inputs.length === 0) {
        let result = generateMarkupErrorsHTML(markupErrors);
        result += '<div style="padding: 20px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; margin-top: 10px;"><strong>❌ input 태그가 발견되지 않았습니다.</strong></div>';
        resultDiv.innerHTML = result;
        return;
    }

    let no_care_type=0;
    let validInputs = [];
    inputs.forEach((input, i) => {
        let type = input.type || 'text';
        if((type=='password' ||type=='text' || type=='email' ||type== 'file' || type=='search'))
        {
            validInputs.push({input: input, originalIndex: i});
            return;
        }
        no_care_type++;
    });

    
    

    let result = `
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin: 0; color: #1e293b;">🔍 접근성 검사 결과</h3>
            <p style="margin: 5px 0 0 0; color: #64748b;">총 ${inputs.length-no_care_type}개의 input 태그를 검사했습니다. 각 항목을 클릭하면 상세 결과를 볼 수 있습니다.</p>
        </div>
        <div style="margin-bottom: 20px;">
    `;
    
    //마크업 오류 표시
    if (markupErrors.length > 0) {
        result += generateMarkupErrorsHTML(markupErrors);
    }
    
    let totalIssues = markupErrors.length; // 마크업 에러 길이 미리 추가
    let totalCompliant = 0; // 총 Compliant 갯수
    
    
    let count=0; // input 몇번째인지 확인하기 위한 변수

    validInputs.forEach(({input, originalIndex}, i) => {
        let type = input.type || 'text'; // 기본 타입 text
        count++;
        
        // input의 줄 번호 찾기
        let lineNumber = findInputLineNumber(code, input, originalIndex);
        
        let basicResult = basic_check(input, doc, originalIndex + 1, type);
        //기본적인 체크 진행

        /* 우선 사용 x
        
        let passwordResult = null;
        // 비밀번호 타입인 경우 추가 검사
        if (type === 'password') {
            passwordResult = checkPassword(input);
        }

        */
       

        let inputHTML = generateInputHTML(input, count, type, basicResult, lineNumber);
        result += inputHTML;
        
        // 총 요약 계산 ( 비밀번호 우선 제외 )
        let inputIssues = basicResult.issues.length;// + (passwordResult ? passwordResult.issues.length : 0);
        let inputCompliant = basicResult.compliant.length;// + (passwordResult ? passwordResult.compliant.length : 0);
        
        totalIssues += inputIssues;
        totalCompliant += inputCompliant;
        
        
    });
    
    result += '</div>';

    // 전체 요약 추가
    let summary = `
        <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #1e293b;">📊 전체 요약</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div style="background: white; padding: 12px; border-radius: 6px; border-left: 4px solid #dc2626;">
                    <div style="color: #dc2626; font-weight: bold; font-size: 18px;">${totalIssues}개</div>
                    <div style="color: #64748b; font-size: 12px;">수정 필요한 항목</div>
                    <div style="color: #dc2626; font-size: 12px;"> 마크업 오류 ${markupErrors.length}개 , 접근성 ${totalIssues-markupErrors.length}개</div>
                </div>
                <div style="background: white; padding: 12px; border-radius: 6px; border-left: 4px solid #22c55e;">
                    <div style="color: #22c55e; font-weight: bold; font-size: 18px;">${totalCompliant}개</div>
                    <div style="color: #64748b; font-size: 12px;">준수 항목</div>
                </div>
            </div>
        </div>
    `;
    
    resultDiv.innerHTML = result + summary;

    resultDiv.innerHTML+=`<br>`

    resultDiv.innerHTML +=showPreview();
}

function basic_check(input,doc,index,type){
        
        let result="";
        let id = input.id;
        let hasLabel=false;
        let isRequired = input.hasAttribute('required');
        let isPattern=input.hasAttribute('pattern');
        let has_pat_pla=false;
        let labelText='';
        if(isPattern){
          has_pat_pla = input.hasAttribute('placeholder');
        }

        // 명시적 레이블 찾기 (for)
        if (id) {
          let label = doc.querySelector(`label[for="${id}"]`);
          if (label) {
            hasLabel = true;
            labelText = label.textContent.trim();
            
          }
        }
        
        // 암시적 label 찾기 (부모)
        if (!hasLabel) {
          let parentLabel = input.closest('label');
          if (parentLabel) {
            hasLabel = true;
            labelText = parentLabel.textContent.trim();
           
          }
        }

        //Aria 설명 제공 유무 판별
        let ariaCheck=false;
        if (id) {
            let ariaLabel = input.getAttribute('aria-label');
            let ariaDescribedby = input.getAttribute('aria-describedby');
            if ((ariaLabel && ariaLabel.trim()) || (ariaDescribedby && ariaDescribedby.trim())) 
            {
              ariaCheck=true;
            }
        }

        //필수 입력인 경우 aria-required 를 제공하는가?
        let aria_siren=false;
        if(isRequired){
          let temp_bool=input.hasAttribute('aria-required');
          if(temp_bool){
            aria_siren=input.getAttribute('aria-required')==='true';
          }
        }

        //title 유무 판별기
        let title_bool=false;
        if(id){
            let title_str= input.getAttribute('title');
            if(title_str && title_str.trim())
                title_bool=true;
        }

        result += `<li><strong>Input ${index}:</strong> type="${type}"`;
        if (id) result += ` id="${id}"`;
        result += '<br>';
        
        
        
        if (hasLabel) 
        { 
          result += '<span class="ok">[✓ Label 있음 (중요도 : 높음)] </span> <br>';
        }
        else
          result += '<span class="warn">[✗ Label 없음 (중요도 : 높음)] </span> <br>'; 
        

        if(ariaCheck) 
            result += '<span style="color:gold; font-weight:bold">[✓ aria 기능 있음 (중요도 : 중간)] </span> <br>';
        else result += '<span class="warn">[✗ aria 기능 없음 (중요도 : 중간)]</span> <br>';      
        
        if(title_bool) 
            result += '<span style="color:gold; font-weight:bold">[✓ title 기능 있음 (중요도 : 중간)] </span> <br>';
        else result += '<span class="warn">[✗ title 기능 없음 (중요도 : 중간)] </span> <br>';    

        if(isRequired){
          if(aria_siren)
            result+='<span class="ok">[✓ 필수입력칸에 aria-required 있음 (중요도 : 높음)] </span> <br>';
          else
            result+='<span class="warn">[✗ 필수입력칸에 aria-required 없음 (중요도 : 높음)] </span> <br>'; 
        }
        if(isPattern){
          if(has_pat_pla)
            result+='<span style="color:gold; font-weight:bold">[✓ 패턴에 대한 placeholder 있음 (중요도 : 중간)] </span> <br>';
          else
            result+='<span class="warn">[✗ 패턴에 대한 placeholder 없음 (중요도 : 중간)] </span> <br>'; 
        }
        result += '</li>';

        return result;
}


function checkPassword(input) {
    let result = "";
    let id = input.id;
    let hasButton = false;
    let toggleInfo = "";
    
    if (id) {
        // 형제 요소에서 버튼찾기
        let next_S = input.nextElementSibling;
        let prev_S = input.previousElementSibling;
        
        if ((next_S && (next_S.tagName === 'BUTTON' || (next_S.tagName === 'INPUT' && next_S.type === 'button')))
            ||(prev_S && (prev_S.tagName === 'BUTTON' || (prev_S.tagName === 'INPUT' && prev_S.type === 'button'))))
            {
              hasButton = true;
              
              let next_id=next_S.id? next_S.id : '';
              let prev_id=prev_S.id? prev_S.id : '';
              
              let n_t=next_S ? (next_S.querySelector('span')?.textContent.trim() ||''):'';
              let p_t=prev_S ? (prev_S.querySelector('span')?.textContent.trim() || '') : '';
              let text_temp=n_t + ' ' + p_t;

              if(next_id || prev_id)
                toggleInfo = `id : ${next_id} ${prev_id}`;
              else if(text_temp.trim())  
                toggleInfo = `text : ${text_temp}`              
            }
        
        
        //다른 형제 내부에 있는 요소
        if (!hasButton) {
            if (next_S || prev_S) {
                let next_temp = next_S ? next_S.querySelector('button, input[type="button"]') : null;
                let prev_temp = prev_S ? prev_S.querySelector('button, input[type="button"]') : null;
                
                if (next_temp || prev_temp) {
                  
                    hasButton = true;
                    let next_id = next_temp ? next_temp.id : '';
                    let prev_id = prev_temp ? prev_temp.id : '';  
                    
                     let n_t = next_temp ? (next_temp.querySelector('span')?.textContent.trim() || '') : '';

                     let p_t = prev_temp ? (prev_temp.querySelector('span')?.textContent.trim() || '') : '';

                    let text_temp=n_t+' '+p_t;

                    if(next_id || prev_id)
                      toggleInfo = `id : ${next_id} ${prev_id}`;
                    else if(text_temp.trim())  
                      toggleInfo = `text : ${text_temp}` 
                    }
            }
            
        }
    }
    
    // 결과 문자열 생성
    result += `<span>`;
    if (hasButton) {
        result += '<span style="color: orange; font-weight: bold">[△ 비밀번호 표시/숨김 기능 있을 가능성 (중요도: 중간)]</span>';
        result += `<br><span style="margin-left: 40px; font-size: 12px; color: gray;">${toggleInfo}</span>`;
    } else {

        result += '<span class="warn">[✗ 비밀번호 표시/숨김 기능 없음 (중요도: 중간)]</span>';

        result += '<br><span style="margin-left: 20px; font-size: 12px; color: gray;">접근성 향상을 위해 비밀번호 보기 기능 추가 권장</span>';
    }
    result += `</span>`;
    
    return result;
}
   

    function checkInputs() {
      //갯수 세는 변수
     

      let code = document.getElementById('input').value.trim();
      let resultDiv = document.getElementById('result');
      resultDiv.style.display = 'block';
      
      if (!code) { // 사용자가 코드를 적지 않는 경우
        resultDiv.innerHTML = '<span class="warn">코드를 입력하세요.</span>';
        return;
      }
      
      let parser = new DOMParser();

      let doc = parser.parseFromString(`<div>${code}</div>`, 'text/html');
      
      let inputs = doc.querySelectorAll('input');
      
      if (inputs.length === 0) {
        resultDiv.innerHTML = '<span class="warn">input 태그가 없습니다.</span>';
        return;
      }
      
      let result = `<h3>결과 (총 ${inputs.length}개 input)</h3><ul>`;
      
      inputs.forEach((input, i) => {
        let type = input.type || 'text';

        result+= basic_check(input,doc,i+1,type);
        //basic check - Label, aria-required, title, aria-label or aria describedby, placeholder 검사


        switch(type){
          /*

            case 'email' : 
            break;
            
            email은 형식만 지키면 되는데, 이 값은 이미 html 자체에서 알린다, 또한 이에 대한 알림은 label에서 처리가능
            
            case 'text' : // 필수 입력 표시 ( 모든 영역 동일 -)
            break;

            basic check에서 대부분 처리한다.

          */

          /*
            case 'file' : // 형식 및 용량 초과 시 명확한 에러 메세지
            break;
            
            //file의 경우에는 accept로 구현한 형식을 자동으로 지정해준다. 이 값은 aria-describedby 혹은 label로 처리가 가능하기에 이부분은 패스.
            // 이외에 size같은 경우는 js에서 구현하기 때문에 html 상으로 확인하긴 어렵다.

          */

            case 'password' : // password 입력창을 볼 수 있는가?(자동가림)
            result +=checkPassword(input);
            break;

          /*  
            case 'search': // 엔터키 검색? 자동완성은 js에서 처리하기 때문에 불가(동적이기도 하다)
            break;
          */
            default:
            break;

        }
        
      });
      
    result += '</ul>';
    resultDiv.innerHTML = result;
    }

// Textos da interface. A chave é o texto em português; cada linha traz, em ordem: en, es, fr, de, ja, ko.
export const IDIOMAS = ['pt', 'en', 'es', 'fr', 'de', 'ja', 'ko'];
const L = `
A imagem aberta tem mudanças que não foram salvas. Deseja substituir?|The open image has unsaved changes. Replace it?|La imagen abierta tiene cambios sin guardar. ¿Quieres reemplazarla?|L'image ouverte contient des modifications non enregistrées. La remplacer ?|Das geöffnete Bild hat ungespeicherte Änderungen. Ersetzen?|開いている画像に未保存の変更があります。置き換えますか?|열려 있는 이미지에 저장하지 않은 변경 사항이 있습니다. 바꿀까요?
A qualidade vale para JPG e WebP. JPG não tem transparência: ela vira branco.|Quality applies to JPG and WebP. JPG has no transparency: it turns white.|La calidad se aplica a JPG y WebP. JPG no tiene transparencia: se vuelve blanco.|La qualité s'applique au JPG et au WebP. Le JPG n'a pas de transparence : elle devient blanche.|Die Qualität gilt für JPG und WebP. JPG hat keine Transparenz: Sie wird weiß.|品質は JPG と WebP に適用されます。JPG には透明がないため白になります。|품질은 JPG와 WebP에 적용됩니다. JPG는 투명을 지원하지 않아 흰색이 됩니다.
A seleção não alcança esta camada|The selection doesn't reach this layer|La selección no alcanza esta capa|La sélection n'atteint pas ce calque|Die Auswahl erreicht diese Ebene nicht|選択範囲がこのレイヤーに届いていません|선택 영역이 이 레이어에 닿지 않습니다
Abra uma foto, crie uma imagem nova ou arraste um arquivo para cá. Também dá para colar uma imagem.|Open a photo, create a new image or drag a file here. You can also paste an image.|Abre una foto, crea una imagen nueva o arrastra un archivo aquí. También puedes pegar una imagen.|Ouvrez une photo, créez une nouvelle image ou glissez un fichier ici. Vous pouvez aussi coller une image.|Öffne ein Foto, erstelle ein neues Bild oder ziehe eine Datei hierher. Du kannst auch ein Bild einfügen.|写真を開くか、新しい画像を作成するか、ファイルをここにドラッグしてください。画像の貼り付けもできます。|사진을 열거나 새 이미지를 만들거나 파일을 여기로 끌어오세요. 이미지를 붙여 넣을 수도 있습니다.
Abrir como camadas…|Open as layers…|Abrir como capas…|Ouvrir en tant que calques…|Als Ebenen öffnen…|レイヤーとして開く…|레이어로 열기…
Sobre o RetoqueShop 1.0|About RetoqueShop 1.0|Acerca de RetoqueShop 1.0|À propos de RetoqueShop 1.0|Über RetoqueShop 1.0|RetoqueShop 1.0 について|RetoqueShop 1.0 정보
Abrir imagem|Open image|Abrir imagen|Ouvrir une image|Bild öffnen|画像を開く|이미지 열기
Abrir…|Open…|Abrir…|Ouvrir…|Öffnen…|開く…|열기…
Achatar imagem|Flatten image|Acoplar imagen|Aplatir l'image|Bild zusammenfügen|画像を統合|이미지 병합
Adicionar máscara|Add mask|Añadir máscara|Ajouter un masque|Maske hinzufügen|マスクを追加|마스크 추가
Afastar|Zoom out|Alejar|Dézoomer|Verkleinern|縮小|축소
Ajustar à janela|Fit to window|Ajustar a la ventana|Ajuster à la fenêtre|An Fenster anpassen|ウィンドウに合わせる|창에 맞추기
Alinhar|Align|Alinear|Aligner|Ausrichten|揃え|정렬
Altura|Height|Altura|Hauteur|Höhe|高さ|높이
Aplicar|Apply|Aplicar|Appliquer|Anwenden|適用|적용
Aplicar máscara|Apply mask|Aplicar máscara|Appliquer le masque|Maske anwenden|マスクを適用|마스크 적용
Aproximar|Zoom in|Acercar|Zoomer|Vergrößern|拡大|확대
Arquivo|File|Archivo|Fichier|Datei|ファイル|파일
Arraste a camada. Com Alt, move só a seleção. Setas movem 1 px.|Drag the layer. With Alt, moves only the selection. Arrow keys move 1 px.|Arrastra la capa. Con Alt, mueve solo la selección. Las flechas mueven 1 px.|Glissez le calque. Avec Alt, déplace seulement la sélection. Les flèches déplacent de 1 px.|Ebene ziehen. Mit Alt wird nur die Auswahl verschoben. Pfeiltasten bewegen um 1 px.|レイヤーをドラッグします。Alt で選択範囲だけを移動。矢印キーで 1 px 移動します。|레이어를 끕니다. Alt를 누르면 선택 영역만 이동합니다. 화살표 키는 1 px씩 이동합니다.
Arraste a área. Enter corta e Esc desiste.|Drag the area. Enter crops and Esc cancels.|Arrastra el área. Enter recorta y Esc cancela.|Glissez la zone. Entrée recadre et Échap annule.|Bereich ziehen. Enter schneidet zu, Esc bricht ab.|範囲をドラッグします。Enter で切り抜き、Esc で取り消します。|영역을 끕니다. Enter는 자르기, Esc는 취소입니다.
Arraste para navegar. Espaço faz o mesmo em qualquer ferramenta.|Drag to navigate. Space does the same in any tool.|Arrastra para navegar. Espacio hace lo mismo en cualquier herramienta.|Glissez pour naviguer. Espace fait de même avec n'importe quel outil.|Zum Navigieren ziehen. Die Leertaste macht das in jedem Werkzeug.|ドラッグで移動します。どのツールでもスペースキーで同じことができます。|끌어서 이동합니다. 어떤 도구에서든 스페이스 키로 같은 동작을 합니다.
Balde|Bucket|Bote|Pot de peinture|Füllen|バケツ|페인트 통
Borracha|Eraser|Borrador|Gomme|Radierer|消しゴム|지우개
Branco|White|Blanco|Blanc|Weiß|白|흰색
Camada|Layer|Capa|Calque|Ebene|レイヤー|레이어
Camada do tamanho da imagem|Layer to image size|Capa al tamaño de la imagen|Calque aux dimensions de l'image|Ebene auf Bildgröße|レイヤーを画像サイズに|레이어를 이미지 크기로
Camadas|Layers|Capas|Calques|Ebenen|レイヤー|레이어
Cancelar|Cancel|Cancelar|Annuler|Abbrechen|キャンセル|취소
Cantos mudam o tamanho e fora da caixa gira. Enter aplica e Esc desiste.|Corners resize and outside the box rotates. Enter applies and Esc cancels.|Las esquinas cambian el tamaño y fuera del cuadro gira. Enter aplica y Esc cancela.|Les coins redimensionnent et l'extérieur du cadre fait pivoter. Entrée applique et Échap annule.|Ecken ändern die Größe, außerhalb des Rahmens wird gedreht. Enter wendet an, Esc bricht ab.|角でサイズ変更、枠の外で回転します。Enter で適用、Esc で取り消します。|모서리로 크기를 바꾸고 상자 밖에서 회전합니다. Enter는 적용, Esc는 취소입니다.
Centralizar o conteúdo|Center the content|Centrar el contenido|Centrer le contenu|Inhalt zentrieren|内容を中央に配置|내용을 가운데로
Centro|Center|Centro|Centre|Mitte|中央|가운데
Clarear|Lighten|Aclarar|Éclaircir|Aufhellen|比較(明)|밝게
Clique na imagem e escreva|Click the image and type|Haz clic en la imagen y escribe|Cliquez sur l'image et écrivez|Ins Bild klicken und schreiben|画像をクリックして入力|이미지를 클릭하고 입력하세요
Clique para aproximar e com Alt para afastar.|Click to zoom in, with Alt to zoom out.|Haz clic para acercar y con Alt para alejar.|Cliquez pour zoomer et avec Alt pour dézoomer.|Klicken zum Vergrößern, mit Alt zum Verkleinern.|クリックで拡大、Alt を押しながらで縮小します。|클릭하면 확대, Alt를 누르고 클릭하면 축소합니다.
Colado|Pasted|Pegado|Collé|Eingefügt|貼り付け|붙여 넣음
Colar|Paste|Pegar|Coller|Einfügen|貼り付け|붙여넣기
Com Ctrl, escolhe a cor de fundo.|With Ctrl, picks the background color.|Con Ctrl, elige el color de fondo.|Avec Ctrl, choisit la couleur d'arrière-plan.|Mit Strg wird die Hintergrundfarbe gewählt.|Ctrl で背景色を選びます。|Ctrl을 누르면 배경색을 고릅니다.
Conta-gotas|Color picker|Cuentagotas|Pipette|Pipette|スポイト|스포이트
Continuar|Continue|Continuar|Continuer|Weiter|続ける|계속
Copiado|Copied|Copiado|Copié|Kopiert|コピーしました|복사됨
Copiar|Copy|Copiar|Copier|Kopieren|コピー|복사
Cor|Color|Color|Couleur|Farbe|カラー|색상
Cor de frente|Foreground color|Color de frente|Couleur de premier plan|Vordergrundfarbe|描画色|전경색
Cor de fundo|Background color|Color de fondo|Couleur d'arrière-plan|Hintergrundfarbe|背景色|배경색
Cores padrão|Default colors|Colores predeterminados|Couleurs par défaut|Standardfarben|既定の色|기본 색상
Cortar|Crop|Recortar|Recadrer|Zuschneiden|切り抜き|자르기
Cortar para a seleção|Crop to selection|Recortar a la selección|Recadrer sur la sélection|Auf Auswahl zuschneiden|選択範囲で切り抜き|선택 영역으로 자르기
Crescer seleção|Grow selection|Ampliar selección|Agrandir la sélection|Auswahl vergrößern|選択範囲を拡張|선택 영역 확장
Crescer…|Grow…|Ampliar…|Agrandir…|Vergrößern…|拡張…|확장…
Criar|Create|Crear|Créer|Erstellen|作成|만들기
Da transparência da camada|From layer transparency|Desde la transparencia de la capa|Depuis la transparence du calque|Aus Ebenentransparenz|レイヤーの透明部分から|레이어 투명도에서
Descer camada|Lower layer|Bajar capa|Descendre le calque|Ebene absenken|レイヤーを下へ|레이어 내리기
Desfazer|Undo|Deshacer|Annuler|Rückgängig|元に戻す|실행 취소
Diferença|Difference|Diferencia|Différence|Differenz|差の絶対値|차이
Direita|Right|Derecha|Droite|Rechts|右|오른쪽
Duplicar camada|Duplicate layer|Duplicar capa|Dupliquer le calque|Ebene duplizieren|レイヤーを複製|레이어 복제
Duplo clique para renomear|Double-click to rename|Doble clic para renombrar|Double-cliquez pour renommer|Doppelklick zum Umbenennen|ダブルクリックで名前を変更|두 번 클릭해 이름 변경
Dureza|Hardness|Dureza|Dureté|Härte|硬さ|경도
Editar|Edit|Editar|Édition|Bearbeiten|編集|편집
Editar a camada|Edit the layer|Editar la capa|Modifier le calque|Ebene bearbeiten|レイヤーを編集|레이어 편집
Editar a máscara|Edit the mask|Editar la máscara|Modifier le masque|Maske bearbeiten|マスクを編集|마스크 편집
Editar texto|Edit text|Editar texto|Modifier le texte|Text bearbeiten|テキストを編集|텍스트 편집
Encolher seleção|Shrink selection|Reducir selección|Réduire la sélection|Auswahl verkleinern|選択範囲を縮小|선택 영역 축소
Encolher…|Shrink…|Reducir…|Réduire…|Verkleinern…|縮小…|축소…
Escurecer|Darken|Oscurecer|Assombrir|Abdunkeln|比較(暗)|어둡게
Espelhar camada|Flip layer|Voltear capa|Retourner le calque|Ebene spiegeln|レイヤーを反転|레이어 뒤집기
Espelhar camada na horizontal|Flip layer horizontally|Voltear capa en horizontal|Retourner le calque horizontalement|Ebene horizontal spiegeln|レイヤーを水平方向に反転|레이어 가로로 뒤집기
Espelhar camada na vertical|Flip layer vertically|Voltear capa en vertical|Retourner le calque verticalement|Ebene vertikal spiegeln|レイヤーを垂直方向に反転|레이어 세로로 뒤집기
Espelhar imagem|Flip image|Voltear imagen|Retourner l'image|Bild spiegeln|画像を反転|이미지 뒤집기
Espelhar na horizontal|Flip horizontally|Voltear en horizontal|Retourner horizontalement|Horizontal spiegeln|水平方向に反転|가로로 뒤집기
Espelhar na vertical|Flip vertically|Voltear en vertical|Retourner verticalement|Vertikal spiegeln|垂直方向に反転|세로로 뒤집기
Esquerda|Left|Izquierda|Gauche|Links|左|왼쪽
Esta camada está travada|This layer is locked|Esta capa está bloqueada|Ce calque est verrouillé|Diese Ebene ist gesperrt|このレイヤーはロックされています|이 레이어는 잠겨 있습니다
Excluir camada|Delete layer|Eliminar capa|Supprimer le calque|Ebene löschen|レイヤーを削除|레이어 삭제
Excluir máscara|Delete mask|Eliminar máscara|Supprimer le masque|Maske löschen|マスクを削除|마스크 삭제
Exclusão|Exclusion|Exclusión|Exclusion|Ausschluss|除外|제외
Exibir|View|Ver|Affichage|Ansicht|表示|보기
Exportar|Export|Exportar|Exporter|Exportieren|書き出し|내보내기
Exportar imagem|Export image|Exportar imagen|Exporter l'image|Bild exportieren|画像を書き出し|이미지 내보내기
Exportar imagem…|Export image…|Exportar imagen…|Exporter l'image…|Bild exportieren…|画像を書き出し…|이미지 내보내기…
Fechar imagem|Close image|Cerrar imagen|Fermer l'image|Bild schließen|画像を閉じる|이미지 닫기
Flutuar seleção|Float selection|Hacer flotante la selección|Rendre la sélection flottante|Auswahl schweben lassen|選択範囲を浮動化|선택 영역 띄우기
Fonte|Font|Fuente|Police|Schrift|フォント|글꼴
Formato|Format|Formato|Format|Format|形式|형식
Fundo|Background|Fondo|Arrière-plan|Hintergrund|背景|배경
Girar 180°|Rotate 180°|Girar 180°|Pivoter de 180°|180° drehen|180° 回転|180° 회전
Girar 90° à direita|Rotate 90° right|Girar 90° a la derecha|Pivoter de 90° à droite|90° nach rechts drehen|右に 90° 回転|오른쪽으로 90° 회전
Girar 90° à esquerda|Rotate 90° left|Girar 90° a la izquierda|Pivoter de 90° à gauche|90° nach links drehen|左に 90° 回転|왼쪽으로 90° 회전
Girar camada|Rotate layer|Girar capa|Faire pivoter le calque|Ebene drehen|レイヤーを回転|레이어 회전
Girar camada 90°|Rotate layer 90°|Girar capa 90°|Faire pivoter le calque de 90°|Ebene um 90° drehen|レイヤーを 90° 回転|레이어 90° 회전
Girar imagem|Rotate image|Girar imagen|Faire pivoter l'image|Bild drehen|画像を回転|이미지 회전
Histórico|History|Historial|Historique|Verlauf|履歴|작업 내역
Imagem|Image|Imagen|Image|Bild|画像|이미지
Imagem aberta|Image opened|Imagen abierta|Image ouverte|Bild geöffnet|画像を開きました|이미지를 열었습니다
Imagem exportada|Image exported|Imagen exportada|Image exportée|Bild exportiert|画像を書き出しました|이미지를 내보냈습니다
Imagem grande demais|Image too large|Imagen demasiado grande|Image trop grande|Bild zu groß|画像が大きすぎます|이미지가 너무 큽니다
Intersectar|Intersect|Intersecar|Intersection|Schnittmenge|交差|교차
Inverter|Invert|Invertir|Inverser|Umkehren|反転|반전
Inverter seleção|Invert selection|Invertir selección|Inverser la sélection|Auswahl umkehren|選択範囲を反転|선택 영역 반전
Início|Start|Inicio|Début|Anfang|最初|처음
Itálico|Italic|Cursiva|Italique|Kursiv|斜体|기울임
Largura|Width|Anchura|Largeur|Breite|幅|너비
Laço|Lasso|Lazo|Lasso|Lasso|なげなわ|올가미
Ligar ou desligar máscara|Turn mask on or off|Activar o desactivar máscara|Activer ou désactiver le masque|Maske ein- oder ausschalten|マスクのオン/オフ|마스크 켜기/끄기
Limpar|Clear|Borrar|Effacer|Löschen|消去|지우기
Luminosidade|Luminosity|Luminosidad|Luminosité|Luminanz|輝度|광도
Luz dura|Hard light|Luz fuerte|Lumière crue|Hartes Licht|ハードライト|하드 라이트
Luz suave|Soft light|Luz suave|Lumière douce|Weiches Licht|ソフトライト|소프트 라이트
Manter proporção|Keep proportions|Mantener proporción|Conserver les proportions|Proportionen beibehalten|縦横比を保持|비율 유지
Matiz|Hue|Tono|Teinte|Farbton|色相|색조
Mesclar para baixo|Merge down|Combinar hacia abajo|Fusionner vers le bas|Nach unten vereinen|下のレイヤーと結合|아래로 병합
Modelo|Preset|Plantilla|Modèle|Vorlage|プリセット|사전 설정
Modo|Mode|Modo|Mode|Modus|モード|모드
Modo da camada|Layer mode|Modo de capa|Mode du calque|Ebenenmodus|レイヤーモード|레이어 모드
Monoespaçada|Monospace|Monoespaciada|Chasse fixe|Monospace|等幅|고정폭
Mostrar ou esconder|Show or hide|Mostrar u ocultar|Afficher ou masquer|Ein- oder ausblenden|表示/非表示|표시/숨기기
Mover|Move|Mover|Déplacer|Verschieben|移動|이동
Mover camada|Move layer|Mover capa|Déplacer le calque|Ebene verschieben|レイヤーを移動|레이어 이동
Mover camada na lista|Reorder layer|Reordenar capa|Réorganiser le calque|Ebene umsortieren|レイヤーを並べ替え|레이어 순서 변경
Mover seleção|Move selection|Mover selección|Déplacer la sélection|Auswahl verschieben|選択範囲を移動|선택 영역 이동
Multiplicar|Multiply|Multiplicar|Produit|Multiplizieren|乗算|곱하기
Máscara: da seleção|Mask: from selection|Máscara: desde la selección|Masque : depuis la sélection|Maske: aus Auswahl|マスク: 選択範囲から|마스크: 선택 영역에서
Máscara: da transparência|Mask: from transparency|Máscara: desde la transparencia|Masque : depuis la transparence|Maske: aus Transparenz|マスク: 透明部分から|마스크: 투명도에서
Máscara: esconde tudo|Mask: hide all|Máscara: ocultar todo|Masque : tout masquer|Maske: alles ausblenden|マスク: すべて隠す|마스크: 모두 숨기기
Máscara: revela tudo|Mask: reveal all|Máscara: mostrar todo|Masque : tout révéler|Maske: alles einblenden|マスク: すべて表示|마스크: 모두 표시
Mão|Hand|Mano|Main|Hand|手のひら|손
Nada|None|Nada|Aucune|Nichts|なし|없음
Nada para colar|Nothing to paste|Nada que pegar|Rien à coller|Nichts zum Einfügen|貼り付けるものがありません|붙여 넣을 내용이 없습니다
Nada selecionado|Nothing selected|Nada seleccionado|Rien de sélectionné|Nichts ausgewählt|選択なし|선택 없음
Negrito|Bold|Negrita|Gras|Fett|太字|굵게
Nome|Name|Nombre|Nom|Name|名前|이름
Normal|Normal|Normal|Normal|Normal|通常|보통
Nova camada|New layer|Nueva capa|Nouveau calque|Neue Ebene|新しいレイヤー|새 레이어
Nova imagem|New image|Nueva imagen|Nouvelle image|Neues Bild|新しい画像|새 이미지
Nova imagem…|New image…|Nueva imagen…|Nouvelle image…|Neues Bild…|新しい画像…|새 이미지…
Não deu para abrir este arquivo|Couldn't open this file|No se pudo abrir este archivo|Impossible d'ouvrir ce fichier|Diese Datei konnte nicht geöffnet werden|このファイルを開けませんでした|이 파일을 열 수 없습니다
Não deu para guardar o rascunho|Couldn't keep the draft|No se pudo guardar el borrador|Impossible de garder le brouillon|Entwurf konnte nicht gespeichert werden|下書きを保存できませんでした|임시 저장을 할 수 없습니다
Olhar todas as camadas|Look at all layers|Mirar todas las capas|Regarder tous les calques|Alle Ebenen berücksichtigen|すべてのレイヤーを参照|모든 레이어 참조
Opacidade|Opacity|Opacidad|Opacité|Deckkraft|不透明度|불투명도
Opacidade da camada|Layer opacity|Opacidad de capa|Opacité du calque|Ebenendeckkraft|レイヤーの不透明度|레이어 불투명도
Pincel|Brush|Pincel|Pinceau|Pinsel|ブラシ|브러시
Preencher|Fill|Rellenar|Remplir|Füllen|塗りつぶし|채우기
Preencher com a cor de frente|Fill with foreground color|Rellenar con el color de frente|Remplir avec la couleur de premier plan|Mit Vordergrundfarbe füllen|描画色で塗りつぶす|전경색으로 채우기
Preencher com a cor de fundo|Fill with background color|Rellenar con el color de fondo|Remplir avec la couleur d'arrière-plan|Mit Hintergrundfarbe füllen|背景色で塗りつぶす|배경색으로 채우기
Projeto aberto|Project opened|Proyecto abierto|Projet ouvert|Projekt geöffnet|プロジェクトを開きました|프로젝트를 열었습니다
Projeto salvo|Project saved|Proyecto guardado|Projet enregistré|Projekt gespeichert|プロジェクトを保存しました|프로젝트를 저장했습니다
Qualidade|Quality|Calidad|Qualité|Qualität|品質|품질
Raio (px)|Radius (px)|Radio (px)|Rayon (px)|Radius (px)|半径 (px)|반경 (px)
Recortar|Cut|Cortar|Couper|Ausschneiden|切り取り|잘라내기
Refazer|Redo|Rehacer|Rétablir|Wiederholen|やり直す|다시 실행
Renomear camada|Rename layer|Renombrar capa|Renommer le calque|Ebene umbenennen|レイヤー名を変更|레이어 이름 변경
Salvando…|Saving…|Guardando…|Enregistrement…|Wird gespeichert…|保存中…|저장 중…
Salvar projeto|Save project|Guardar proyecto|Enregistrer le projet|Projekt speichern|プロジェクトを保存|프로젝트 저장
Saturação|Saturation|Saturación|Saturation|Sättigung|彩度|채도
Selecionar|Select|Seleccionar|Sélection|Auswahl|選択|선택
Selecionar tudo|Select all|Seleccionar todo|Tout sélectionner|Alles auswählen|すべて選択|모두 선택
Seleção da camada|Selection from layer|Selección desde la capa|Sélection depuis le calque|Auswahl aus Ebene|レイヤーから選択|레이어에서 선택
Seleção elíptica|Ellipse select|Selección elíptica|Sélection elliptique|Elliptische Auswahl|楕円選択|타원 선택
Seleção flutuante|Floating selection|Selección flotante|Sélection flottante|Schwebende Auswahl|浮動選択範囲|떠 있는 선택 영역
Seleção retangular|Rectangle select|Selección rectangular|Sélection rectangulaire|Rechteckige Auswahl|矩形選択|사각형 선택
Sistema|System|Sistema|Système|System|システム|시스템
Sobrepor|Overlay|Superponer|Incrustation|Überlagern|オーバーレイ|오버레이
Somar|Add|Sumar|Ajouter|Hinzufügen|加算|더하기
Suavizar|Feather|Suavizar|Adoucir|Weiche Kante|ぼかし|부드럽게
Suavizar seleção|Feather selection|Suavizar selección|Adoucir la sélection|Auswahl weichzeichnen|選択範囲をぼかす|선택 영역 부드럽게
Suavizar…|Feather…|Suavizar…|Adoucir…|Weiche Kante…|ぼかし…|부드럽게…
Subexpor cor|Color dodge|Sobreexponer color|Densité couleur -|Farbig abwedeln|覆い焼きカラー|색상 닷지
Subir camada|Raise layer|Subir capa|Monter le calque|Ebene anheben|レイヤーを上へ|레이어 올리기
Subtrair|Subtract|Restar|Soustraire|Abziehen|減算|빼기
Superexpor cor|Color burn|Subexponer color|Densité couleur +|Farbig nachbelichten|焼き込みカラー|색상 번
Só o que está ligado|Only what is connected|Solo lo conectado|Seulement ce qui est connecté|Nur Zusammenhängendes|隣接部分のみ|연결된 부분만
Tamanho|Size|Tamaño|Taille|Größe|サイズ|크기
Tamanho da imagem|Image size|Tamaño de imagen|Taille de l'image|Bildgröße|画像サイズ|이미지 크기
Tamanho da imagem…|Image size…|Tamaño de imagen…|Taille de l'image…|Bildgröße…|画像サイズ…|이미지 크기…
Tamanho da tela|Canvas size|Tamaño del lienzo|Taille du canevas|Leinwandgröße|キャンバスサイズ|캔버스 크기
Tamanho da tela…|Canvas size…|Tamaño del lienzo…|Taille du canevas…|Leinwandgröße…|キャンバスサイズ…|캔버스 크기…
Tela|Screen|Trama|Superposition|Negativ multiplizieren|スクリーン|스크린
Tela cheia|Full screen|Pantalla completa|Plein écran|Vollbild|全画面|전체 화면
Tem certeza?|Are you sure?|¿Seguro?|Êtes-vous sûr ?|Bist du sicher?|よろしいですか?|계속할까요?
Texto|Text|Texto|Texte|Text|テキスト|텍스트
Tolerância|Threshold|Tolerancia|Seuil|Schwellwert|しきい値|허용치
Trabalho recuperado|Work recovered|Trabajo recuperado|Travail récupéré|Arbeit wiederhergestellt|作業を復元しました|작업을 복구했습니다
Transformar|Transform|Transformar|Transformer|Transformieren|変形|변형
Transparente|Transparent|Transparente|Transparent|Transparent|透明|투명
Travar camada|Lock layer|Bloquear capa|Verrouiller le calque|Ebene sperren|レイヤーをロック|레이어 잠금
Trocar|Replace|Reemplazar|Remplacer|Ersetzen|置換|바꾸기
Trocar cores|Swap colors|Intercambiar colores|Échanger les couleurs|Farben tauschen|色を入れ替え|색상 바꾸기
Tudo|All|Todo|Tout|Alles|すべて|모두
Varinha|Magic wand|Varita|Baguette|Zauberstab|自動選択|마술봉
Zoom|Zoom|Zoom|Zoom|Zoom|ズーム|확대/축소
camada|layer|capa|calque|Ebene|レイヤー|레이어
camadas|layers|capas|calques|Ebenen|レイヤー|레이어
cópia|copy|copia|copie|Kopie|コピー|복사본
sem-titulo|untitled|sin-titulo|sans-titre|unbenannt|無題|제목-없음
`;
const T = {};
for (const linha of L.trim().split('\n')) { const [pt, ...resto] = linha.split('|'); T[pt] = resto; }
let idioma = 'pt';
export const t = s => (idioma === 'pt' ? s : T[s]?.[IDIOMAS.indexOf(idioma) - 1] || s);
export const definirIdioma = i => { idioma = IDIOMAS.includes(i) ? i : 'en'; document.documentElement.lang = idioma; };
export const TEXTOS = T;

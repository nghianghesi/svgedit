/**
* This is a very basic SVG-Edit extension. It adds bidatick designer features.
*/
const name = 'bidatick'

const loadExtensionTranslation = async function(svgEditor) {
    let translationModule
    const lang = svgEditor.configObj.pref('lang')
    try {
        translationModule = await import(`./locale/${lang}.js`)
    } catch (_error) {
        console.warn(`Missing translation (${lang}) for ${name} - using 'en'`)
        translationModule = await import('./locale/en.js')
    }
    svgEditor.i18next.addResourceBundle(lang, name, translationModule.default)
}




export default {
    name,
    async init({ _importLocale }) {
        const svgEditor = this
        await loadExtensionTranslation(svgEditor)
        const { svgCanvas } = svgEditor
        const { $id, $click, $qa, $qq } = svgCanvas
        const btSeatGroupAttribute = 'data-bt_group'
        const btSeatIdxAttribute = 'data-bt_seat'
        const btSeatTagsAttribute = 'data-bt_tags'
        const btPreviewAttribute = 'data-bt_preview'

        let assigningSeats = null
        let tagPreviewSelector = null
        let grpInput = null

        function isInSeatGroup(st, grp) {
            return st.getAttribute(btSeatGroupAttribute) == grp
        }

        function trimTags(tags) {
            tags = tags.trim()
            let tagSplit = []
            tags.split(',').forEach((t) => {
                let tt = t.trim()
                if (tt > '') {
                    tagSplit.push(tt)
                }
            })
            return tagSplit.join(',')
        }

        function startAssignSeats(grp, tags) {
            grp = grp.trim()
            tags = trimTags(tags)
            if (grp > '') {
                let tagSplit = []
                tags.split(',').forEach((t) => {
                    let tt = t.trim()
                    if (tt > '') {
                        tagSplit.push(tt)
                    }
                })
                tags = tagSplit.join(',')
                let startIdx = 1
                $qa(`[${btSeatGroupAttribute}]`).forEach((st) => {
                    if (isInSeatGroup(st, grp)) {
                        if (st.hasAttribute(btSeatIdxAttribute)) {
                            let seatNum = parseInt(st.getAttribute(btSeatIdxAttribute))
                            if (seatNum >= startIdx) {
                                startIdx = seatNum + 1
                            }
                        }
                    }
                })

                setSeatAssigning({
                    grp,
                    tags,
                    startIdx
                })
            } else {
                alert(svgEditor.i18next.t(`${name}:messages.missing_grp`))
            }
        }

        function assignNextSeat(item) {
            if (assigningSeats != null && !item.hasAttribute(btPreviewAttribute)) {
                item.setAttribute(btSeatTagsAttribute, assigningSeats.tags)
                if (!isInSeatGroup(item, assigningSeats.grp) || !item.hasAttribute(btSeatIdxAttribute)) {
                    removePreview(item)
                    item.setAttribute(btSeatGroupAttribute, assigningSeats.grp)
                    item.setAttribute(btSeatIdxAttribute, assigningSeats.startIdx++)
                }

                showPreview(item)

                if (assigningSeats.startIdx > 1000) {
                    alert(svgEditor.i18next.t(`${name}:messages.large_seat_number`))
                }
            }
        }

        function assignSeats() {
            svgCanvas.getSelectedElements().forEach((item) => {
                assignNextSeat(item)
            })
        }

        function assignTags(tags) {
            tags = trimTags(tags)
            if (tags > '') {
                svgCanvas.getSelectedElements().forEach((item) => {
                    item.setAttribute(btSeatTagsAttribute, tags)
                })
            }
        }

        function unassignSeats() {
            svgCanvas.getSelectedElements().forEach((item) => {
                removePreview(item)
                item.removeAttribute(btSeatGroupAttribute)
                item.removeAttribute(btSeatIdxAttribute)
                item.removeAttribute(btSeatTagsAttribute)
            })
        }
        
        function removePreview(st) {
            let infoText = st.getAttribute(btSeatGroupAttribute) + st.getAttribute(btSeatIdxAttribute)
            let previewId = `${infoText}_preview`
            let name = $id(previewId)
            if (name != null) {
                name.remove()
            }
        }        

        function showPreview(st) {
            let { x, y, width, height } = st.getBBox()
            let cx = x + width / 2 - 5
            let cy = y + height + 12
            let infoText = st.getAttribute(btSeatGroupAttribute) + st.getAttribute(btSeatIdxAttribute)
            let previewId = `${infoText}_preview`
            let name = $id(previewId)

            if (name == null) {
                name = document.createElementNS("http://www.w3.org/2000/svg", "text")
                name.setAttribute("x", cx)
                name.setAttribute("y", cy)
                name.setAttribute(btPreviewAttribute, infoText)
                name.setAttribute('id', previewId)
                name.innerHTML = infoText
                st.parentNode.append(name)
            }
        }
        
        function togglePreview() {
            let hasPreview = false
            $qa(`text[${btPreviewAttribute}]`).forEach((pr) => {
                pr.remove()
                hasPreview = true
            })
            tagPreviewSelector.$select.hidden=true;

            if (!hasPreview) {
                let tags = [`${name}:texts.opt_select_preview_tag`]
                let hasTag = false; 
                $qa(`[${btSeatGroupAttribute}]`).forEach((st) => {
                    showPreview(st)
                    if (st.getAttribute(btSeatTagsAttribute) > '') {
                        st.getAttribute(btSeatTagsAttribute).split(',').forEach((t) => {
                            t = t.trim();
                            if (t > '' && tags.indexOf(t) < 0) {
                                tags.push(t)
                                hasTag = true;
                            }
                        })                        
                    }
                })
                
                if(hasTag) {
                    tagPreviewSelector.$select.hidden=false
                    tags.sort()
                    tagPreviewSelector.setAttribute('options', tags.join(','))
                }
            }
        }

        function setSeatAssigning(val) {
            assigningSeats = val
            if (assigningSeats != null) {
                grpInput.label = `${name}:texts.lbl_assigning_seat_for_group`
                grpInput.$input.readOnly = true
            } else {
                grpInput.value = ''
                grpInput.$input.readOnly = false
                grpInput.label = `${name}:texts.lbl_group`
            }
        }


        return {
            name: svgEditor.i18next.t(`${name}:name`),
            callback() {
                // Add the button and its handler(s)
                const buttonTemplate = document.createElement('template')
                buttonTemplate.innerHTML = `
		<div>
			<se-input id="bt_grp_input" size="10" label="${name}:texts.lbl_group" title="${name}:texts.lbl_group"></se-input>
            <se-input id="bt_tags_input" size="10" label="${name}:texts.lbl_tags" title="${name}:texts.lbl_tags"></se-input>
            <se-button class="selected_panel multiselected_panel" id="bt_tagging" title="${name}:texts.bt_tagging" src="tag-ticket.svg"></se-button>        
			<se-button id="bt_toggle_seat_assigning" title="${name}:texts.bt_toggle_seat_assigning" src="ticket.svg"></se-button>
        </div>
        
		<div class="selected_panel multiselected_panel">
			<se-button id="bt_unassign_seat" title="${name}:texts.btn_unassign_seat" src="remove-ticket.svg"></se-button>
		</div>	
        
        <div>
            <se-button id="bt_toggle_preview" title="${name}:texts.bt_toggle_preview" src="preview-ticket.svg"></se-button>
            <se-select id="tag_preview" title='${name}:texts.opt_select_preview_tag'></se-select>
        </div>
                	
        `
                $id('tools_top').append(buttonTemplate.content.cloneNode(true))
                buttonTemplate.remove()
                
                grpInput = $id('bt_grp_input')
                tagPreviewSelector = $id('tag_preview')
                tagPreviewSelector.$select.hidden=true
                $click($id('bt_toggle_seat_assigning'), () => {
                    if (assigningSeats != null) {
                        setSeatAssigning(null)
                    } else {
                        startAssignSeats(grpInput.value.trim(), $id('bt_tags_input').value.trim())
                        assignSeats()
                    }
                })

                $click($id('bt_tagging'), () => {
                    assignTags($id('bt_tags_input').value.trim())
                })

                $click($id('bt_unassign_seat'), () => {
                    if (assigningSeats == null) {
                        unassignSeats()
                    } else {
                        alert(svgEditor.i18next.t(`${name}:messages.assigning_seat_mode`))
                    }
                })

                $click($id('bt_toggle_preview'), () => {
                    togglePreview()
                })
            },
            // This is triggered from anywhere, but "started" must have been set
            // to true (see above). Note that "opts" is an object with event info

            selectedChanged (opts){
                if (assigningSeats != null) {
                    opts.elems.forEach((st)=>{
                        assignNextSeat(st)
                    })
                }
            }
        }
    }
}
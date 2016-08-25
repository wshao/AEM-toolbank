/**
 *
 * Node based MultiCompositeField Widget
 *
 * This widget extends MultiField widget from AEM, and allow different types of widgets to be included
 * in the MultiField widget.
 *
 * It stores each item to an individual JCR node.
 *
 * Note: This widget doesn't support all of the widget types at the moment. There are supported types:
 *
 * 1. TextField
 * 2. TextArea
 * 3. NumberField
 * 4. Select (Dropdown)
 *
 */
(function () {
    var WIDGET_SELECTOR = ".coral-Multifield[data-type=node-based]",
        CORAL_FORM_FIELDWRAPPER = ".coral-Form-fieldwrapper",
        CORAL_FORM_FIELDSET = ".coral-Form-fieldset",
        CORAL_SELECT = ".coral-Select",
        JS_CORAL_MULTIFIELD_INPUT_TEMPLATE = ".js-coral-Multifield-input-template",
        JS_CORAL_MULTIFIELD_ADD = ".js-coral-Multifield-add",
        JCR_PRIMARY_TYPE = "jcr:primaryType";


    function init() {
        addDataIntoFields();
        submitData();
    }

    /**
     *
     *  When the dialog is open, it sends the request to JCR for component dialog data.
     *  And it adds data to all MultiCompositeField widgets.
     *
     *  Note: When there is more than one MultiCompositeField configured in the dialog,
     *        please make sure they are using different base name which is set in the fieldset.
     *
     */
    function addDataIntoFields() {
        $(document).on("dialog-ready", function () {

            var $multifields = $(WIDGET_SELECTOR);

            /*Do nothing when type is not matching*/
            if (_.isEmpty($multifields)) {
                return;
            }

            /* Build a map that key is the based name, value is corresponding the widget element */
            var multifieldMap = getMultifieldMap($multifields),
                $form = $(".cq-dialog"),
                actionUrl = $form.attr("action") + ".infinity.json";

            $.ajax(actionUrl).done(processData);

            function processData(data) {

                /* Loop through all MultiCompositeField widgets on the dialog, and build each one*/
                _.each(multifieldMap, function ($multifields, multifieldName) {
                    buildMultifield(data[multifieldName], $multifields, multifieldName);
                });

            }
        });
    }

    /**
     *
     * When dialog is submitted, it inserts the hidden inputs into the dialog form for submitting
     * MultiCompositeField data.
     *
     */
    function submitData() {

        $(document).on("click", ".cq-dialog-submit", function () {

            var $multifields = $(WIDGET_SELECTOR);

            if (_.isEmpty($multifields)) {
                return;
            }

            var $form = $(this).closest("form.foundation-form"),
                $fieldSets,
                $fields;

            /* For each MultiCompositeField widget on the dialog*/
            $multifields.each(function (i, multifield) {

                $fieldSets = $(multifield).find(CORAL_FORM_FIELDSET);

                /* For each composite field */
                $fieldSets.each(function (counter, fieldSet) {

                    $fields = $(fieldSet).find(CORAL_FORM_FIELDWRAPPER);

                    /*For each field*/
                    $fields.each(function (j, field) {
                        fillValue($form, $(fieldSet).data("name"), $(field).find("[name]"), (counter + 1));
                    });

                    /* Prevent saving data on the fieldset node*/
                    $('<input />').attr('type', 'hidden')
                        .attr('name', $(fieldSet).data("name") + "@Delete")
                        .attr('value', "true")
                        .appendTo($form);
                });
            });
        });
    }


    /**
     * Iterate the MultiField element list, and construct a map where the key is the base name of the MultiCompositeField
     * and the value is the element itself.
     *
     * @param $multifields
     * @returns MultifieldMap
     */

    function getMultifieldMap($multifields) {
        var multifieldMap = {},
            multifieldName;

        $multifields.each(function (i, multifield) {

            multifieldName = $($(multifield).find(JS_CORAL_MULTIFIELD_INPUT_TEMPLATE).html()).data("name");

            if (_.isEmpty(multifieldName)) {
                return;
            }

            multifieldName = multifieldName.substring(2);

            multifieldMap[multifieldName] = $(multifield);
        });

        return multifieldMap;
    }


    /**
     * Configure to Select field to use given value.
     * @param $field
     * @param value
     */
    function setSelect($field, value) {
        var select = $field.closest(CORAL_SELECT).data("select");
        if (select) {
            select._select.val(value).trigger('change');
        }
    }

    /**
     * Based on the data stored in JCR, it build the MultiField widget in the dialog UI.
     *
     * @param multifieldData
     * @param $multifield
     * @param multifieldName
     */
    function buildMultifield(multifieldData, $multifield, multifieldName) {

        console.info("===MultfiField Data==");
        console.info(multifieldData);

        /* Do nothing when there is no data or no matching base name*/
        if (_.isEmpty(multifieldName) || _.isEmpty(multifieldData)) {
            return;
        }

        /* For each Composite Field node data*/
        _.each(multifieldData, function (listItem, itemKey) {

            /*Ignore CQ default data*/
            if (itemKey === JCR_PRIMARY_TYPE) {
                return;
            }

            /* Add a new item in the UI*/
            $multifield.find(JS_CORAL_MULTIFIELD_ADD).click();


            /* For each property saved in the item node*/
            _.each(listItem, function (fieldValue, fieldKey) {
                if (fieldKey == JCR_PRIMARY_TYPE) {
                    return;
                }

                /* Find the last form element that matches the node property */
                var $field = $multifield.find("[name='./" + fieldKey + "']").last();

                /* Ingore if there is no field matched */
                if (_.isEmpty($field)) {
                    return;
                }

                var type = $field.prop("type");

                //Set the value into the UI
                if (type == "select-one") {
                    setSelect($field, fieldValue);
                } else {
                    $field.val(fieldValue);
                }
            });

        });
    }


    /**
     * Add hidden form element in order to save the data into the JCR nodes. The JCR node structure will be
     *
     *  + component_node
     *      + fileSetName
     *          + 1
     *              _fieldName1:Value
     *              _fieldName2:Value
     *          + 2
     *              _fieldName1:Value
     *              _fieldName2:Value
     *
     * @param $form
     * @param fieldSetName
     * @param $field
     * @param counter
     */
    function fillValue($form, fieldSetName, $field, counter) {

        var name = $field.attr("name");

        if (!name) {
            return;
        }

        /* Strip ./ from the name value */
        if (name.indexOf("./") == 0) {
            name = name.substring(2);
        }

        var value = $field.val();

        $('<input />').attr('type', 'hidden')
            .attr('name', fieldSetName + "/" + counter + "/" + name)
            .attr('value', value)
            .appendTo($form);

        //remove the field, so that individual values are not POSTed
        $field.remove();
    }

    /**
     *
     * Register the widget
     *
     */
    $(document).ready(function () {
        init();
    });

})();
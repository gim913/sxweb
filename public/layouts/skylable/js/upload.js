
/*
    The contents of this file are subject to the Common Public Attribution License
    Version 1.0 (the "License"); you may not use this file except in compliance with
    the License. You may obtain a copy of the License at
    http://opensource.org/licenses/cpal_1.0. The License is based on the Mozilla
    Public License Version 1.1 but Sections 14 and 15 have been added to cover use
    of software over a computer network and provide for limited attribution for the
    Original Developer. In addition, Exhibit A has been modified to be consistent with
    Exhibit B.
    
    Software distributed under the License is distributed on an "AS IS" basis, WITHOUT
    WARRANTY OF ANY KIND, either express or implied. See the License for the
    specific language governing rights and limitations under the License.
    
    The Original Code is the SXWeb project.
    
    The Original Developer is the Initial Developer.
    
    The Initial Developer of the Original Code is Skylable Ltd (info-copyright@skylable.com). 
    All portions of the code written by Initial Developer are Copyright (c) 2013 - 2015
    the Initial Developer. All Rights Reserved.

    Contributor(s):    

    Alternatively, the contents of this file may be used under the terms of the
    Skylable White-label Commercial License (the SWCL), in which case the provisions of
    the SWCL are applicable instead of those above.
    
    If you wish to allow use of your version of this file only under the terms of the
    SWCL and not to allow others to use your version of this file under the CPAL, indicate
    your decision by deleting the provisions above and replace them with the notice
    and other provisions required by the SWCL. If you do not delete the provisions
    above, a recipient may use your version of this file under either the CPAL or the
    SWCL.
*/


/**
 * Handle file uploads.
 *
 * Variables the you must define elsewhere:
 * 'upload_url' - string, the URL to call for uploading files
 *
 * You must include jQuery, jQueryUI, sprintf.js, the language file
 * and the file_operations.js before this file.
 */

if (!Skylable_Uploads) {
	/**
	 * Holds the parameters for the upload handler
	 * @type {{is_working: boolean}}
	 */
	var Skylable_Uploads = {
		is_working : false,
		dlg : null,
		has_errors : false,
		reset : function(){
			this.is_working = false;
			this.dlg = null;
			this.has_errors = false;
		}
	};
}

$(document).ready(function(){

	$("#addfile, #addfile_mobile").click(function(){
		$('#fileupload').click();
	});

	$('#fileupload').fileupload({
		url: upload_url,
		dataType: 'json',
        sequentialUpload: true,
        
        add : function(e, data) {
            $.each(data.files, function (index, file) {
                if (file.size > maxFileSize) {
                    var dlg = $('<div id="upload_too_big"></div>').appendTo('body');
                    dlg.dialog({
                        autoOpen: false,
                        modal : true,
                        resizable: true,
                        title: Skylable_Lang.uploadTitle,
                        buttons :[{
                            text: Skylable_Lang.cancelBtn,
                            click : function() {
                                $(this).dialog('close');
                                $(this).dialog('destroy');
                            }
                        }]
                    });
                    dlg.html('<p>'+ Skylable_Utils.nl2br(sprintf(Skylable_Lang.uploadExceedingFileSize, file.name, file.size, maxFileSize)) +'</p>');
                    dlg.dialog('open');
                    
                } else {
                    // Check if the file exists, and asks what to do
                    $.ajax({
                        async: false,
                        url: "/fileexists",
                        data: 'path=' + encodeURIComponent(current_path + file.name),
                        dataType: "json",
                        success : function(qdata, status, xhr) {
                           if (qdata.status == false) {
                               data.submit();
                           } else {
                               var dlg = $('<div id="upload_ask_confirm"></div>').appendTo('body');
                               dlg.dialog({
                                   autoOpen: false,
                                   modal : true,
                                   resizable: true,
                                   title: Skylable_Lang.uploadTitle,
                                   buttons :[{
                                       text: Skylable_Lang.yesBtn,
                                       click : function() {
                                           $(this).dialog('close');
                                           data.submit();
                                       }
                                   },{
                                       text: Skylable_Lang.noBtn,
                                       click : function() {
                                           $(this).dialog('close');
                                           $(this).dialog('destroy');
                                       }
                                   }]
                               });
                               dlg.html('<p>'+ Skylable_Utils.nl2br(sprintf(Skylable_Lang.uploadFileAlreadyExistsOverwrite, file.name)) +'</p>');
                               dlg.dialog('open');
                           } 
                        },
                        error : function(xhr, status) {
                            
                            var dlg = $('<div id="upload_add_error"></div>').appendTo('body');
                            dlg.dialog({
                                autoOpen: false,
                                modal : true,
                                resizable: true,
                                title: Skylable_Lang.uploadTitle,
                                buttons :[{
                                    text: Skylable_Lang.cancelBtn,
                                    click : function() {
                                        $(this).dialog('close');
                                        $(this).dialog('destroy');
                                    }
                                }]
                            });

                            if (xhr.getResponseHeader('Content-Type') === 'application/json') {
                                var response_text = JSON.parse(xhr.responseText);
                                dlg.html('<p>'+ response_text.error +'</p>');
                            } else {
                                dlg.html(xhr.responseText);
                            }

                            dlg.dialog('open');
                        }
                        
                    });
                }
            });
        },
		start : function(e) {

			Skylable_Uploads.dlg = $('#dialog');

			Skylable_Uploads.dlg.dialog({
				autoOpen: false,
				modal: true,
				resizable: true,
				title: Skylable_Lang.uploadTitle,
				beforeClose: function(ev, ui) {
					// Avoids closing while AJAX calls
					if (Skylable_Uploads.is_working) {
						return false;
					}
				}
			});

			Skylable_Uploads.is_working = true;
			Skylable_Uploads.has_errors = false;
			Skylable_Uploads.dlg.html('<div id="progressbar"><div class="progress-label"></div></div><div id="files"></div>');
			$('#progressbar').progressbar({
				max : 100,
				value : 1,
				enable: true
			});

			Skylable_Uploads.dlg.dialog('option', 'buttons', [
				{
					text : Skylable_Lang.closeBtn,
					click : function(e) {
						Skylable_Uploads.dlg.dialog('close');
					}
				}
			]);

			Skylable_Uploads.dlg.dialog('open');
		},
		progressall: function (e, data) {
			var progress = parseInt(data.loaded / data.total * 100, 10);
			$('#progressbar').progressbar('option', 'value', progress);
			$('#progressbar .progress-label').text(progress + '%');
		},
		done: function(e, data) {
			$('#progressbar').progressbar('value', 100);
			$('#progressbar .progress-label').text('100%');

			var reply_box = $('#dialog #files');

			if (data.textStatus === 'success') {
				for(var idx in data.result.files) {
					var the_file = data.result.files[idx];
					if (the_file.error) {
						Skylable_Uploads.has_errors = true;
                        reply_box.append('<p class="upload_error">' + sprintf(Skylable_Lang.uploadFailed, Skylable_Utils.trs(the_file.old_name, 55), the_file.error) + '</p>');
					} else {
                        reply_box.append('<p class="upload_success">'+ sprintf(Skylable_Lang.uploadSuccess, Skylable_Utils.trs(the_file.old_name, 55)) + '</p>');
					}
				}
			} else {
				Skylable_Uploads.has_errors = true;
                reply_box.append('<p class="upload_error">' + sprintf(Skylable_Lang.uploadError , data.errorThrown ) + '</p>');
			}
		},
		fail: function(e, data) {
			var reply_box = $('#dialog #files');
			var err_msg = data.errorThrown;

			if (data.jqXHR.status == 500) {
				if (data.jqXHR.responseJSON.files) {
					err_msg = data.jqXHR.responseJSON.files[0].error;
				} else if (data.jqXHR.responseJSON.error) { // Internal error
					err_msg = data.jqXHR.responseJSON.error;
				}
			}

			Skylable_Uploads.has_errors = true;
            if (err_msg.length == 0) {
                err_msg = Skylable_Lang.uploadAborted;
            }

            reply_box.append('<p class="upload_error">' + sprintf(Skylable_Lang.uploadError , err_msg ) + '</p>');

		},
		stop: function(e, data) {

			FileOperations.updateFileList();

			Skylable_Uploads.is_working = false;

			if (!Skylable_Uploads.has_errors) {
				Skylable_Uploads.dlg.dialog('close');
			}
		}
	});
});

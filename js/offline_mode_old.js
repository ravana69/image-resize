var uploaded_images = [];
var image_id_count = 1;
var addedDownloadAreaAd = false;
///////////////
// UPLOADING //
///////////////

//offline dropzone setup
function setup_offline_form(){
	var dropzone = $('#dropzone-container-offline');

	var droppedFiles = false;
	  dropzone.on('drag drop dragenter dragleave dragend dragover dragstart', function(e) {
	    e.stopPropagation();
	    e.preventDefault();
	  }).on('click', function(){
			ga("send", "event", "Clicked to upload image");
	  	$('#offline-file-field').click();
	  }).on('dragenter dragover', function() {
	    dropzone.addClass('is-dragging-over');
	  })
	  .on('drop dragleave dragend', function() {
	    dropzone.removeClass('is-dragging-over');
	  })
	  .on('drop', function(e) {
			ga("send", "event", "Dropped a file");
	    droppedFiles = e.originalEvent.dataTransfer.files;
	    getDroppedImagesFromFiles(droppedFiles);
	  });
	if(document.getElementById("offline-file-field")){
		document.getElementById("offline-file-field").addEventListener("change", onImageUpload, false);
	}
}

setup_offline_form();

// UPLOAD DETECTION AND PROCESSING
function onImageUpload(ev) {
	$("#error_message_offline").hide();
	var processor = new ImageProcessor();
	var fileField = ev.target;

	getDroppedImagesFromFiles(fileField.files);
	fileField.files = undefined;
}

function getDroppedImagesFromFiles(files) {
	var images = [];
	var errorFiles = [];
	//uploaded_images = [];

	var new_images = [];
	if(files.length > 0) {
		if(isValidFileType(files[0])) {
			var resizeJob = ImageProcessor.getUploadedResizeJob(files[0]);
			new_images.push(resizeJob);
			ga("send","event","Image Upload Success", "Free", resizeJob.originalExtension);
		} else {
			errorFiles.push(files[0]);
		}
	}

	if(new_images.length > 0) {
		uploaded_images = new_images;
	}

	showUploadError(errorFiles);
	showUploadedImagesAsync();
}

function isValidFileType(file) {
	return file.type == "image/jpeg"
			|| file.type == "image/jpg"
			|| file.type == "image/gif"
			|| file.type == "image/png"
			|| file.type == "image/bmp"
			|| file.type == "image/tiff";
}

function showUploadError(errorFiles) {
	if(errorFiles.length == 0) {
		return;
	}
	var boldedNames = errorFiles.map(function(f) { return "<b>"+f.name+"</b>"; });
	//var errorMessage = "ERROR: " + toSentence(boldedNames) + " are not supported images. Please upload a JPG, PNG, GIF, BMP or TIFF";
	$("#error_message_offline #failedFilesList").html(toSentence(boldedNames));
	$("#error_message_offline").show();
}

function toSentence(arr) {
	if(arr.length == 0) {
		return "";
	}
	if(arr.length == 1) {
		return arr[0];
	}

	return arr.slice(0, arr.length - 1).join(', ') + ", " + (language=="en" ? "and" : "y") +" " + arr.slice(-1);
}

function showUploadedImagesAsync() {
	setTimeout("showUploadedImages()", 20);
}

function showUploadedImages(){
	removeImagePreviews();
	if(uploaded_images.length > 0) {
		showUploadedImage(uploaded_images[0]);
	}
	setDropzoneVisibilities(uploaded_images);
}

function setDropzoneVisibilities(images) {
	if(images.length > 0) {
		$("#dropzone-container-offline .drop-message").hide();
		$("#dropzone-container-offline #reduce_images_button").css("display", "inline-block");
		$("#resize-form-offline").show();
	} else {
		$("#dropzone-container-offline .drop-message").show();
		$("#dropzone-container-offline #reduce_images_button").css("display", "none");
		$("#resize-form-offline").hide();
	}
}

function removeImage(id) {
	for(var i=0; i < uploaded_images.length; i++){
		if(uploaded_images[i].id==id){
			uploaded_images.splice(i,1);
		}
	}
	showUploadedImages();
}

function removeImagePreviews() {
	$("#dropzone-container-offline #previews .uploaded_image").remove();
}

function showUploadedImage(imageModel) {
	var uploadedImage = $("#uploaded_image_mock").clone();
	uploadedImage.attr("id", "image_preview_" + imageModel.id);

	var imagePreview = uploadedImage.find("img.preview");
	var filename = uploadedImage.find("div.filename");
	var imagesize = uploadedImage.find("div.imagesize");
	var filesize = uploadedImage.find("div.filesize");
	var removeButton = uploadedImage.find("div.close_button");

	imagePreview.attr("src",imageModel.img.src);
	filename.html(imageModel.name);
	imagesize.html(imageModel.img.width + " x " + imageModel.img.height);

	originalWidth = imageModel.img.width;
	originalHeight = imageModel.img.height;

	filesize.html(formatBytes(imageModel.file.size));

	removeButton.bind('click', function(event) {
		removeImage(imageModel.id);
		event.stopPropagation();
	});

	$("#dropzone-container-offline #previews").append(uploadedImage);
}

function formatBytes(a,b){
	if (0==a) return"0 Bytes";
	var c = 1024;
	var d = b||2;
	var e = ["Bytes","KB","MB","GB","TB","PB","EB","ZB","YB"];
	var f = Math.floor(Math.log(a)/Math.log(c));
	return parseFloat((a/Math.pow(c,f)).toFixed(d))+" "+e[f]
}



//////////////
// RESIZING //
//////////////
function submitResizeForm(event){
	$(".button-and-filesize").addClass("hidden");
	$(".button-and-filesize").removeClass("visible-xs");
	$("#progress-section").removeClass("hidden");
    resize_images();
    if (!triggerBookmark()) {
        var msg = 'Press ' + (/Mac/i.test(navigator.platform) ? 'Cmd' : 'Ctrl') + '+D to bookmark this page.';
        var element = document.createElement("div");
        element.innerHTML = msg;
        document.getElementById("progress_and_download_area").appendChild(element);
    }
}

if(document.getElementById("offline-submit-button")) {
	document.getElementById("offline-submit-button").addEventListener("click", submitResizeForm, false);
}

function resize_images() {
	initializeJobs();
	addResults();
	showDownloadAreaAndStart();
}

function initializeJobs(){
	initializeJob(uploaded_images[0]);
}

function initializeJob(job){
	job.wantedWidth = $('#width_field').val();
	job.wantedHeight = $('#height_field').val();
	job.wantedUnits = $('#selector_units').val();
	job.wantedMode = selectedMode;
	job.wantedExtension = $('#selector_extension').val();
	job.wantedQuality = $('#sector_calidad input').val() / 100.0;
	job.wantedBackgroundColor = $("#background_color_field").val();
	job.progress=0;
}

// DISPLAYING RESULTS
function addResults() {
	$('#final_image_buttons_container').empty();
	if(uploaded_images.length > 0) {
		addResultFile(uploaded_images[0]);
	}
}

function addResultFile(imageModel) {
	var resultDiv = $("#final-image-button-mock").clone();
	resultDiv.attr("id", "final_image_button_" + imageModel.id);

	var fileName = resultDiv.find("span.image-file-name");
	var fileSize = resultDiv.find("span.image-file-size");
	var icon = resultDiv.find("img.image-file-icon");

	icon.attr("src", imageModel.img.src);
	fileName.html(imageModel.getFinalFilename(imageModel.wantedExtension));

	updateProgressCircle(resultDiv, imageModel.progress);

	$("#final_image_buttons_container").append(resultDiv);
}

function showDownloadAreaAndStart(){
	var title = $('#progress_and_download_area #download_area_title');
	title.removeClass("singular");
	title.removeClass("plural");
	title.addClass(uploaded_images.length > 1 ? "plural" : "singular");
	$('#progress_and_download_area').show();
	scrollToDownloadArea();

	$('#progress_and_download_area #final_image_buttons_container').hide();
	$('#progress_and_download_area #final_image_buttons_container').slideDown(100, function() {
		if (!pro && !addedDownloadAreaAd) {
			add_new_ad("progress_and_download_area");
			loadOneAd();
			addedDownloadAreaAd = true;
		}
		startResizingJobs();
	});
}

function startResizingJobs() {
	if(uploaded_images.length > 0) {
		processResizeJob(uploaded_images[0]);
	}
}

function processResizeJob(job) {
	try{
		if (job.wantedUnits=="percent") {
			ImageProcessor.resizeImageByScale(job, job.wantedWidth / 100.0, job.wantedHeight / 100.0, job.wantedMode, job.wantedExtension, job.wantedQuality, job.wantedBackgroundColor);
		} else {
			ImageProcessor.resizeImageBySize(job, job.wantedWidth, job.wantedHeight, job.wantedMode, job.wantedExtension, job.wantedQuality, job.wantedBackgroundColor);
		}
	} catch(e) {
		console.log(e);
		job.setFinalImageString("");
	}
}

// PROGRESS
function updateProgressCircle(resultDiv, percentage) {
	if(percentage >= 100) {
		resultDiv.find("div.progress_circle_container").hide();
		resultDiv.find("img.download_icon").show();
	} else {
		resultDiv.find("div.progress_circle_container").show();
		resultDiv.find("img.download_icon").hide();
	}

	var progressCanvasContainer = resultDiv.find("div.progress_circle_container");
	var can = progressCanvasContainer.find('.progress_circle_canvas').get(0),
    spanPercent = progressCanvasContainer.find('.progress_circle_text').get(0),
    c = can.getContext('2d');

	var posX = can.width / 2;
    var posY = can.height / 2;
    var borderWidth = 5;
    var onePercentAngle = 360 / 100;
    var angle = onePercentAngle * percentage;
    var radius = posX - borderWidth / 2;

	c.lineCap = 'bottom';

    c.clearRect( 0, 0, can.width, can.height );

    spanPercent.innerHTML = percentage.toFixed();

    c.beginPath();
    c.arc( posX, posY, radius, (Math.PI/180) * 270, (Math.PI/180) * (270 + 360));
    c.strokeStyle = '#ddd';
    c.lineWidth = borderWidth;
    c.stroke();

    c.beginPath();
    c.strokeStyle = '#3ABBA2';
    c.lineWidth = borderWidth;
    c.arc( posX, posY, radius, (Math.PI/180) * 270, (Math.PI/180) * (270 + angle) );
    c.stroke();
}

function getExtension(filename) {
	var regex = /(?:\.([^.]+))?$/;
	return regex.exec(filename)[1];
}

// IMAGE MODEL
function ResizeJob(id, name, file, img) {
	this.id = id;
	this.name = name;
	this.file = file;
	this.img = img;
	this.progress = 0;
	this.finalImageString = "";
	this.originalExtension = getExtension(name);

	this.wantedWidth = 1;
	this.wantedHeight = 1;
	this.wantedUnits = "percent";
	this.wantedMode = "stretch";
	this.wantedExtension = "jpeg";
	this.wantedQuality = 70;
	this.wantedBackgroundColor = "#FFFFFFFF";

	this.getFinalFilename = function(extension) {
		var finalExtension = extension.replace("jpeg", "jpg");
		return name.replace(/\.[A-Za-z]*$/i, "." + finalExtension);
	}

	this.getResultDiv = function() {
		return $('#final_image_button_' + this.id);
	}

	this.updateResultInfo = function() {
		var resultContainer = this.getResultDiv();
		var fileSize = resultContainer.find("span.image-file-size");
		fileSize.html(this.getFinalFilesizeString());
		resultContainer.attr("data-id", this.id);
		resultContainer.bind('click', function(event) {
			ga('send','event','Download image', (pro ? "Pro" : "Free"));
			ImageProcessor.downloadImageFromResizeJob(this.dataset.id);
			event.stopPropagation();
		});
	}

	this.getFinalFilesizeString = function() {
		if (this.finalImageString.length <= 23) {
			return "ERROR";
		}
		return formatBytes((this.finalImageString.length - 23) * 0.75);
	}

	this.setProgress = function(progress) {
		this.progress = progress;
		updateProgressCircle(this.getResultDiv(), progress);
	}

	this.setFinalImageString = function(finalImageString) {
		this.finalImageString = finalImageString;
		this.setProgress(100);
		this.updateResultInfo();
        incrementImageCounter();

		if(!paralellizeDownloads) {
			downloadNextIfNeeded();
		}
		ga("send","event","Image Resize Success", (pro ? "Pro" : "Free"), this.wantedExtension);

	}
}

function scrollToDownloadArea() {
	var htmlBody = $("html, body");
	var minScroll = $('#download_area_title').offset().top  - $(window).height() + 300;
	if (htmlBody.scrollTop() < minScroll) {
		htmlBody.animate({ scrollTop: minScroll }, 400);
	}
}

function downloadNextIfNeeded(){
}

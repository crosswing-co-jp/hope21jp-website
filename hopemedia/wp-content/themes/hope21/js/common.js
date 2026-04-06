/* ===========================================
common.js
=========================================== */
/*===========================================
setting
true OR false
=========================================== */
//pegetopボタン途中で止める
var pagetopStop = true;
//PC SP 画像切り替え
var imageSwitch = true;

/*===========================================
function
=========================================== */
(function($){
"use strict";

/* change images when hovered
------------------------------------- */
//setting
var changeImg = $('img[src*="_n."],input[src*="_n."]');

//preload
$(function(){
	changeImg.each(function(){
		var img = new Image();
		img.src = String($(this).attr('src')).replace(/_n\.(.*)$/,'_o.$1');
	});
});

//event
$(function(){
	changeImg.hover(function(){
		$(this).attr('src',$(this).attr('src').replace('_n.','_o.'));
	},function(){
		$(this).attr('src',$(this).attr('src').replace('_o.','_n.'));
	});
});

/* smoothScroll
------------------------------------- */
//scroll speed
var speed = 500;

//pagetop btn
$('a[href="#top"]').on('click',function(){
	$('body,html').animate({scrollTop:'0'}, speed, 'swing');
	return false;
});

//other link
$('a[href^="#"]:not([href="#top"])').on('click',function(){
	var href= $(this).attr('href');
	var target = $(href === '#' || href === '' ? 'html' : href);
	var position = target.offset().top;
	$('body,html').animate({scrollTop:position}, speed, 'swing');
	return false;
});

/* js-pagetop
------------------------------------- */
if($('#js-pagetop').length){
	//setting
	var pagetop = $('#js-pagetop');
	
	//fadeIn / fadeOut
	$(window).scroll(function(){
		if($(this).scrollTop() > 300){
			pagetop.fadeIn('fast');
		}else{
			pagetop.fadeOut('fast');
		}
	});

	//if want to stop the object#page-top near footer area
	if(pagetopStop){
		$(window).bind("scroll",function(){
			var scrollHeight	= $(document).height();
			var scrollPosition	= $(window).height() + $(window).scrollTop(); 
			var footHeight		= $("#gFooter").innerHeight(); 

			//pattern A (add/remove .stop)
			if(scrollHeight-scrollPosition <= footHeight){ 
				pagetop.addClass('stop');	
			}else{
				pagetop.removeClass('stop');	
			}		
			
			//pattern B (set bottom)
			var bottomPosition = 20;
			var newBottom = footHeight + bottomPosition - (scrollHeight-scrollPosition);

			if(scrollHeight-scrollPosition <= footHeight){ 
				pagetop.css({
					"position":"fixed",
					"bottom":newBottom+"px"
				});
			}else{
				pagetop.css({
					"position":"fixed",
					"bottom":bottomPosition+"px"
				});			
			}
		});
	}
}

/* js-switch-tabs
------------------------------------- */
if($('#js-switch-tabs').length){
	$('#js-switch-tabs li').on('click',function(){
		//num set
		var num = $('#js-switch-tabs li').index(this);
	
		//class="active" set in content
		$('.js-switch-content').removeClass('active');
		$('.js-switch-content').eq(num).addClass('active');
	
		//class="active" set in tab
		$('#js-switch-tabs li').removeClass('active');
		$(this).addClass('active');
	});
}

/* js-toggle
------------------------------------- */
if($('.js-toggle-tit').length){
	$('.js-toggle-tit').on('click',function(){
		$(this).toggleClass('on');
		$(this).next('.js-toggle-content').slideToggle('fast');
	});
}

/* js-btn-menu
------------------------------------- */
if($('#js-btn-menu').length){
	$('#js-btn-menu,#js-btn-close,#js-overlay').on('click',function(){
		$('#js-btn-menu').toggleClass('open');
		$('#js-overlay').fadeToggle('fast');
		$('#gNav').slideToggle();
	});
}

/* js-switch-img
------------------------------------- */
if(imageSwitch){
	$(function() {
		var replaceWidth = 600;
		function imageSwitch(){
			var windowWidth = parseInt($(window).width());
			$('img[src*="_sp."],img[src*="_pc."]').each(function(){
				if(windowWidth >= replaceWidth){
					$(this).attr('src',$(this).attr('src').replace('_sp.', '_pc.'));
				}else{
					$(this).attr('src',$(this).attr('src').replace('_pc.', '_sp.'));
				}
			});
		}
		imageSwitch();
		var resizeTimer;
		$(window).on('resize',function(){
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(function(){
				imageSwitch();
			},200);
		});
	});
}


var $win = $(window);

$win.on('load resize', function() {
  var windowWidth = $win.width();

  if (windowWidth >= 600) {
	$('#gNav > ul > li.gNavCat').hover(function(){
		$(".gNavCatSub").stop().slideDown("fast");
	}, function(){
		$(".gNavCatSub").stop().slideUp("fast");
	});
  } else {
	if($('.gNavCat a').length){
		$('.gNavCat a').on('click',function(){
			$(this).toggleClass('on');
			$('.gNavCatSub').slideToggle('fast');
		});
	}
  }
});


$('#gNav .hdFixWrap li.gNavFixCat').hover(function(){
	$(".gNavFixCatSub").stop().slideDown("fast");
}, function(){
	$(".gNavFixCatSub").stop().slideUp("fast");
});


$(document).ready(function() {
	var $win = $(window),
	    $nav = $('.hdFixWrap'),
	    navHeight = $nav.outerHeight(),
	    navPos = $nav.offset().top,
	    fixedClass = 'is-fixed';

	$win.on('load scroll', function() {
		var value = $(this).scrollTop();
		if ( value > navPos ) {
			$nav.addClass(fixedClass);
			//$main.css('margin-top', navHeight);
		} else {
			$nav.removeClass(fixedClass);
			//$main.css('margin-top', '0');
		}
	});
});
})(jQuery);

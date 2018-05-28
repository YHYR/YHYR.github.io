//---------
// toc
//---------

import Utils from './utils'

exports.init = () => {

	initToc();
	addListener();
	fixToc();

}

function addListener() {

	const $tc = $('.toc-contents'),
		$tl = $('.toc-list');


	$tc.click(() => {

		if ($tl.is(':visible')) {
			$tl.hide();

		} else {
			$tl.show();
		}
	});
}


function initToc() {
	//获取第一级目录	
	const $level = $('h1');

	//如果是空的话 不显示toc
	if ($level.length == 0)
		return;
	else
		$('.toc-container').show();


	//toc 容器
	const $toc = $('.toc-list');

	$level.each(function (i) {

		//第一级目录添加id
		let id = "content-item" + i;
		$(this).attr("id", id).addClass("itemFollow");


		//添加第一级目录	
		let html = $(this).text();

		let li = "<li id=\"toc-item-" + i + "\"   class=\"toc-item\" >" + html + "</li>";
		$toc.append(li);

		//获取到下一个第一级目录中的所有元素
		let $sub = $(this).nextUntil('h1');
		//遍历判断添加
		$sub.each(function (j) {
			let $holder = $(this);
			//判断是 h2 h3 的元素则添加
			if ($holder.length != 0 && 　(　$holder[0].tagName == 'H2' || 　$holder[0].tagName == 'H3')) {
				//添加第二级目录的id
				let sub_id = "content-subitem" + i + j;
				$(this).attr("id", sub_id).addClass("itemSubFollow");
				//创建html语句						
				let sub_html = $holder.text();
				let sub_li = "<li id=\"toc-subitem-" + i + j + "\" class =\"toc-subitem\">" + sub_html + " </li>";
				$toc.append(sub_li);
				//绑定第二级点击跳转事件				
				$('#toc-subitem-' + i + j).click(function () {
					Utils.scrollToId(sub_id);
				});
			}
		})
		//绑定第一级点击跳转事件
		$('#toc-item-' + i).click(function () {
			Utils.scrollToId(id);
		})
	})


}



//滑动 固定Toc
function fixToc() {
	$(window).scroll(() => {
		let srcollTop = $(window).scrollTop();
		srcollTop <= 10 ? resetTocFollow() : openTocFollow();
		tocPosition()
	})
}


function tocPosition() {

	const $tc = $(".toc-container");

	if ($tc.length > 0) {
		//获取 toc 容器 到 document 的 距离
		let ot = $tc.offset().top,
			st = $(window).scrollTop();

		if (ot < st) {
			$tc.addClass('toc-fixed');
		}
		if (st < 90 || checkIsHideToc()) {
			$tc.removeClass('toc-fixed');
		}
	}
}


//开启所有的Toc跟踪
function openTocFollow() {
	$('.itemFollow').each(function () {
		if (getOffsetTop($(this)) <= 40) {
			let text = $(this).text();
			highLight($('.toc-item'), text);
		}
	})

	$('.itemSubFollow').each(function () {
		if (getOffsetTop($(this)) <= 60) {
			let text = $(this).text();
			highLight($('.toc-subitem'), text);
		}
	})
}

//清除所有的Toc跟踪
function resetTocFollow() {
	$('.toc-item').each(function () {

		$(this).removeClass('toc-active');
	})
	$('.toc-subitem').each(function () {

		$(this).removeClass('toc-active');

	})
}


function highLight($item, text) {
	$item.each(function () {

		let self = $(this);
		self.removeClass('toc-active');

		if (self.text().trim() == text) {
			self.addClass('toc-active');
		}
	})
}

function getOffsetTop($obj) {
	const mTop = $obj.offset().top,
		sTop = $(window).scrollTop();
	return mTop - sTop;
}

function checkIsHideToc() {
	const height = $(window).height(),
		nav_height = $('.post-footer').offset().top - $(document).scrollTop();
	return (nav_height <= height);
}
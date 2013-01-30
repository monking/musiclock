<?php
class Playlist {

	public $list;
	public $audio_dir;

	public function Playlist($options = array()) {
		$defaults = array(
			'audio_dir' => __DIR__
		);
		foreach ($defaults as $key => $value) {
			$this->$key = (isset($options[$key])) ? $options[$key] : $value;
		}
		$this->buildPlaylist();
	}

	private function buildPlaylist() {
		$this->list = array();
		$all_handle = opendir($this->audio_dir);
		while ($hour = readdir($all_handle)) {
			if ($hour == '.' || $hour == '..') continue;
			$hour_handle = opendir($this->audio_dir . '/' . $hour);
			$this->list[$hour] = array();
			while ($file = readdir($hour_handle)) {
				if ($file == '.' || $file == '..') continue;
				$this->list[$hour][] = $file;
			}
			closedir($hour_handle);
		}
		closedir($all_handle);
		ksort($this->list);
	}

}
